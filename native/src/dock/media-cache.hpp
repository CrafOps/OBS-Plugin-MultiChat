#pragma once

#include <QObject>
#include <QNetworkAccessManager>
#include <QCache>
#include <QHash>
#include <QSet>
#include <QQueue>
#include <QTimer>
#include <QPixmap>
#include <QImage>
#include <QFutureWatcher>
#include <QBuffer>
#include <QMovie>
#include <functional>
#include <memory>

struct DecodedMedia {
    QImage image;
    QByteArray format;
    bool animated = false;
};

class MediaCache final : public QObject {
public:
    MediaCache(QObject *parent, std::function<void()> changed);
    ~MediaCache() override;
    QPixmap image(const QString &url);
    static bool allowed(const QUrl &url);

private:
    struct Animation {
        std::unique_ptr<QBuffer> buffer;
        std::unique_ptr<QMovie> movie;
        qint64 lastUsed = 0;
    };
    void pump();
    void finish(const QString &url);
    QNetworkAccessManager network;
    QCache<QString, QPixmap> images{16384};
    QHash<QString, std::shared_ptr<Animation>> animations;
    QSet<QString> pending;
    QSet<QString> failed;
    QQueue<QString> queue;
    QList<QFutureWatcher<DecodedMedia> *> decoders;
    QTimer refresh;
    std::function<void()> changed;
    int active = 0;
    bool dirty = false;
};
