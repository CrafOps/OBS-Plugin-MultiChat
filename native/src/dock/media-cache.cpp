#include "media-cache.hpp"
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QImageReader>
#include <QDateTime>
#include <QUrl>
#include <QtConcurrent/QtConcurrentRun>
#include <algorithm>

namespace {
constexpr qint64 byteLimit = 2 * 1024 * 1024;

DecodedMedia decode(const QByteArray &bytes)
{
    QBuffer buffer;
    buffer.setData(bytes);
    buffer.open(QIODevice::ReadOnly);
    QImageReader reader(&buffer);
    const auto format = reader.format().toLower();
    if (!QList<QByteArray>{"png", "jpeg", "jpg", "gif", "webp"}.contains(format)) {
        return {};
    }
    const auto size = reader.size();
    if (!size.isValid() || size.width() > 1536 || size.height() > 1536) {
        return {};
    }
    DecodedMedia result;
    result.format = reader.format();
    // Avoid animating large full-screen effects inside the chat dock.
    result.animated = reader.supportsAnimation() && size.width() <= 512 && size.height() <= 512;
    reader.setScaledSize(size.scaled(96, 96, Qt::KeepAspectRatio));
    result.image = reader.read();
    return result;
}
}

bool MediaCache::allowed(const QUrl &url)
{
    if (url.scheme() != "https" || !url.userInfo().isEmpty() || url.port(443) != 443) {
        return false;
    }
    const auto host = url.host().toLower();
    const QStringList domains{
        "ggpht.com", "googleusercontent.com", "ytimg.com", "gstatic.com", "youtube.com",
        "tiktokcdn.com", "tiktokcdn-us.com", "tiktokcdn-eu.com", "byteoversea.com",
        "ibytedtos.com", "ibyteimg.com", "byteimg.com", "muscdn.com"
    };
    for (const auto &domain : domains) {
        if (host == domain || host.endsWith("." + domain)) {
            return true;
        }
    }
    return false;
}

MediaCache::MediaCache(QObject *parent, std::function<void()> callback)
    : QObject(parent), changed(std::move(callback))
{
    refresh.setInterval(80);
    connect(&refresh, &QTimer::timeout, this, [this] {
        const auto now = QDateTime::currentMSecsSinceEpoch();
        for (const auto &animation : animations) {
            if (now - animation->lastUsed > 800) {
                animation->movie->setPaused(true);
            }
        }
        if (dirty) {
            dirty = false;
            changed();
        }
    });
    refresh.start();
}

MediaCache::~MediaCache()
{
    refresh.stop();
    for (auto *reply : network.findChildren<QNetworkReply *>()) {
        disconnect(reply, nullptr, this, nullptr);
        reply->abort();
    }
    // Worker code belongs to this module; join bounded decodes before DLL unload.
    for (auto *decoder : decoders) {
        disconnect(decoder, nullptr, this, nullptr);
        decoder->waitForFinished();
    }
}

QPixmap MediaCache::image(const QString &url)
{
    if (animations.contains(url)) {
        const auto animation = animations.value(url);
        animation->lastUsed = QDateTime::currentMSecsSinceEpoch();
        animation->movie->setPaused(false);
        return animation->movie->currentPixmap();
    }
    if (const auto *cached = images.object(url)) {
        return *cached;
    }
    if (url.isEmpty() || !allowed(QUrl(url)) || failed.contains(url) || pending.contains(url)) {
        return {};
    }
    if (pending.size() < 64) {
        pending.insert(url);
        queue.enqueue(url);
        pump();
    }
    return {};
}

void MediaCache::finish(const QString &url)
{
    pending.remove(url);
    --active;
    pump();
}

void MediaCache::pump()
{
    while (active < 4 && !queue.isEmpty()) {
        const auto url = queue.dequeue();
        ++active;
        QNetworkRequest request{QUrl(url)};
        request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::ManualRedirectPolicy);
        request.setAttribute(QNetworkRequest::CookieLoadControlAttribute, QNetworkRequest::Manual);
        request.setAttribute(QNetworkRequest::CookieSaveControlAttribute, QNetworkRequest::Manual);
        request.setTransferTimeout(10000);
        auto *reply = network.get(request);
        auto bytes = std::make_shared<QByteArray>();
        reply->setReadBufferSize(byteLimit + 1);
        connect(reply, &QNetworkReply::readyRead, this, [reply, bytes] {
            bytes->append(reply->readAll());
            if (bytes->size() > byteLimit) {
                reply->abort();
            }
        });
        connect(reply, &QNetworkReply::finished, this, [this, reply, bytes, url] {
            bytes->append(reply->readAll());
            const bool ok = reply->error() == QNetworkReply::NoError
                && reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt() == 200
                && bytes->size() <= byteLimit;
            reply->deleteLater();
            if (!ok) {
                if (failed.size() >= 512) {
                    failed.clear();
                }
                failed.insert(url);
                finish(url);
                return;
            }
            auto *watcher = new QFutureWatcher<DecodedMedia>(this);
            decoders.append(watcher);
            connect(watcher, &QFutureWatcher<DecodedMedia>::finished, this, [this, watcher, bytes, url] {
                const auto result = watcher->result();
                decoders.removeAll(watcher);
                watcher->deleteLater();
                if (result.image.isNull()) {
                    if (failed.size() >= 512) {
                        failed.clear();
                    }
                    failed.insert(url);
                } else {
                    const auto pixmap = QPixmap::fromImage(result.image);
                    if (images.size() >= 256) {
                        images.remove(images.keys().first());
                    }
                    images.insert(url, new QPixmap(pixmap), std::max(1, static_cast<int>(result.image.sizeInBytes() / 1024)));
                    if (result.animated && QMovie::supportedFormats().contains(result.format)) {
                        if (animations.size() >= 8) {
                            // Keep only a small set of visible animated assets.
                            auto oldest = animations.begin();
                            for (auto entry = animations.begin(); entry != animations.end(); ++entry) {
                                if (entry.value()->lastUsed < oldest.value()->lastUsed) {
                                    oldest = entry;
                                }
                            }
                            animations.erase(oldest);
                        }
                        auto animation = std::make_shared<Animation>();
                        animation->buffer = std::make_unique<QBuffer>();
                        animation->buffer->setData(*bytes);
                        animation->buffer->open(QIODevice::ReadOnly);
                        animation->movie = std::make_unique<QMovie>(animation->buffer.get(), result.format);
                        animation->movie->setCacheMode(QMovie::CacheNone);
                        animation->movie->setScaledSize(result.image.size());
                        animation->lastUsed = QDateTime::currentMSecsSinceEpoch();
                        connect(animation->movie.get(), &QMovie::frameChanged, this, [this](int) {
                            dirty = true;
                        });
                        animations.insert(url, animation);
                        animation->movie->start();
                    }
                    dirty = true;
                }
                finish(url);
            });
            watcher->setFuture(QtConcurrent::run([bytes] { return decode(*bytes); }));
        });
    }
}
