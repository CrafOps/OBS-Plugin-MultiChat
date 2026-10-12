#include "chat-delegate.hpp"
#include <QJsonObject>
#include <QJsonArray>
#include <QPainter>
#include <QTextDocument>
#include <QAbstractItemView>
#include <QDateTime>
#include <QApplication>
#include <algorithm>
#include <QPainterPath>

namespace {
class MediaDocument final : public QTextDocument {
public:
    MediaDocument(MediaCache *cache, bool fetch) : cache(cache), fetch(fetch) {}

protected:
    QVariant loadResource(int type, const QUrl &url) override
    {
        if (type != QTextDocument::ImageResource || !MediaCache::allowed(url)) {
            return {};
        }
        if (fetch) {
            const auto image = cache->image(url.toString());
            if (!image.isNull()) {
                return image.toImage();
            }
        }
        QImage placeholder(22, 22, QImage::Format_ARGB32_Premultiplied);
        placeholder.fill(Qt::transparent);
        return placeholder;
    }

private:
    MediaCache *cache;
    bool fetch;
};

QString imageMarkup(const QString &url, const QString &alt, int size)
{
    if (!MediaCache::allowed(QUrl(url))) {
        return alt.toHtmlEscaped();
    }
    return QString("<img src='%1' alt='%2' width='%3' height='%3' style='vertical-align:middle;'>")
        .arg(QUrl(url).toString(QUrl::FullyEncoded).toHtmlEscaped().replace("'", "&#39;"),
            alt.toHtmlEscaped().replace("'", "&#39;"), QString::number(size));
}

QString content(const QJsonObject &event)
{
    const auto user = event.value("user").toObject();
    QStringList badges;
    for (const auto &badge : user.value("badges").toArray()) {
        badges.append(badge.toString().toHtmlEscaped());
    }
    const auto platform = event.value("platform").toString();
    auto body = event.value("message").toString().toHtmlEscaped();
    const auto parts = event.value("messageParts").toArray();
    if (!parts.isEmpty()) {
        body.clear();
        for (const auto &value : parts) {
            const auto part = value.toObject();
            body += part.value("type").toString() == "image"
                ? imageMarkup(part.value("url").toString(), part.value("alt").toString(), 22)
                : part.value("text").toString().toHtmlEscaped();
        }
    }
    body.replace("\n", "<br>");
    const auto monetary = event.value("monetaryEvent").toObject();
    QString payment;
    if (!monetary.isEmpty()) {
        if (monetary.contains("giftName")) {
            payment = QString("%1 ×%2").arg(monetary.value("giftName").toString(),
                monetary.value("quantity").toVariant().toString());
            if (event.value("message").toString() == monetary.value("giftName").toString()) {
                payment = QString("×%1").arg(monetary.value("quantity").toVariant().toString());
            }
        } else {
            payment = QString("%1 %2").arg(monetary.value("amount").toVariant().toString(),
                monetary.value("currency").toString());
        }
    }
    const auto mediaUrl = event.value("media").toObject().value("imageUrl").toString();
    const auto mediaMarkup = mediaUrl.isEmpty() ? QString()
        : imageMarkup(mediaUrl, event.value("message").toString(), 48);
    return QString(
        "<div style='color:#f0f2f7;'><b>%1</b></div>"
        "<div style='font-size:9pt;color:%2;'>%3 <span style='color:#969eb3;'>%4 · %7</span></div>"
        "<div style='margin-top:7px;color:#d9deeb;'>%5</div>"
        "<div style='margin-top:4px;color:#f5cb79;'>%8 %6</div>")
        .arg(user.value("displayName").toString().toHtmlEscaped(),
            platform == "youtube" ? "#ff828e" : "#60ded5",
            platform == "youtube" ? "YOUTUBE" : "TIKTOK",
            badges.join(" · "), body, payment.toHtmlEscaped(),
            QDateTime::fromMSecsSinceEpoch(static_cast<qint64>(event.value("timestamp").toDouble())).toString("HH:mm:ss"),
            mediaMarkup);
}

void prepare(QTextDocument &document, const QJsonObject &event, const QFont &font, int width)
{
    document.setDefaultFont(font);
    document.setDocumentMargin(0);
    document.setHtml(content(event));
    document.setTextWidth(std::max(100, width));
}
}

ChatDelegate::ChatDelegate(QObject *parent) : QStyledItemDelegate(parent)
{
    media = new MediaCache(this, [this] {
        if (auto *view = qobject_cast<QAbstractItemView *>(this->parent())) {
            view->viewport()->update();
        }
    });
}

QSize ChatDelegate::sizeHint(const QStyleOptionViewItem &option, const QModelIndex &index) const
{
    const auto *view = qobject_cast<const QAbstractItemView *>(parent());
    const int width = view ? view->viewport()->width() : option.rect.width();
    MediaDocument document(media, false);
    prepare(document, index.data(Qt::UserRole + 2).toJsonObject(), option.font, width - 82);
    return QSize(width, std::max(88, static_cast<int>(document.size().height()) + 28));
}

void ChatDelegate::paint(QPainter *painter, const QStyleOptionViewItem &option,
    const QModelIndex &index) const
{
    const auto event = index.data(Qt::UserRole + 2).toJsonObject();
    const auto user = event.value("user").toObject();
    const auto type = event.value("type").toString();
    const bool paid = type == "gift" || type == "superchat";
    const QColor accent = paid ? QColor("#f5cb79")
        : event.value("platform").toString() == "youtube" ? QColor("#ff828e") : QColor("#60ded5");
    painter->save();
    painter->setRenderHint(QPainter::Antialiasing);
    const auto card = option.rect.adjusted(2, 3, -2, -3);
    painter->setPen(QPen(paid ? QColor("#5e4b30") : QColor("#2a3040")));
    painter->setBrush(paid ? QColor("#27231f") : QColor("#1c212d"));
    painter->drawRoundedRect(card, 10, 10);
    painter->setPen(Qt::NoPen);
    painter->setBrush(accent);
    painter->drawRoundedRect(QRect(card.left() + 1, card.top() + 14, 3, card.height() - 28), 1, 1);
    const QRect avatar(card.left() + 13, card.top() + 14, 28, 28);
    painter->setBrush(QColor("#30384a"));
    painter->drawEllipse(avatar);
    painter->setPen(accent);
    auto avatarFont = option.font;
    avatarFont.setBold(true);
    painter->setFont(avatarFont);
    painter->drawText(avatar, Qt::AlignCenter, user.value("displayName").toString().left(1).toUpper());
    const auto profile = media->image(user.value("avatarUrl").toString());
    if (!profile.isNull()) {
        painter->save();
        QPainterPath clip;
        clip.addEllipse(QRectF(avatar));
        painter->setClipPath(clip);
        painter->setRenderHint(QPainter::SmoothPixmapTransform);
        painter->drawPixmap(avatar, profile);
        painter->restore();
    }
    MediaDocument document(media, true);
    prepare(document, event, option.font, card.width() - 76);
    painter->translate(card.left() + 52, card.top() + 13);
    document.drawContents(painter, QRectF(0, 0, card.width() - 62, card.height() - 22));
    painter->restore();
}
