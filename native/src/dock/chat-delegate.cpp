#include "chat-delegate.hpp"
#include <QJsonObject>
#include <QJsonArray>
#include <QPainter>
#include <QTextDocument>
#include <QAbstractItemView>
#include <QDateTime>
#include <QApplication>
#include <algorithm>

namespace {
QString content(const QJsonObject &event)
{
    const auto user = event.value("user").toObject();
    QStringList badges;
    for (const auto &badge : user.value("badges").toArray()) {
        badges.append(badge.toString().toHtmlEscaped());
    }
    const auto platform = event.value("platform").toString();
    auto body = event.value("message").toString().toHtmlEscaped();
    body.replace("\n", "<br>");
    const auto monetary = event.value("monetaryEvent").toObject();
    QString payment;
    if (!monetary.isEmpty()) {
        if (monetary.contains("giftName")) {
            payment = QString("%1 ×%2").arg(monetary.value("giftName").toString(),
                monetary.value("quantity").toVariant().toString());
        } else {
            payment = QString("%1 %2").arg(monetary.value("amount").toVariant().toString(),
                monetary.value("currency").toString());
        }
    }
    return QString(
        "<div style='color:#f0f2f7;'><b>%1</b></div>"
        "<div style='font-size:9pt;color:%2;'>%3 <span style='color:#969eb3;'>%4 · %7</span></div>"
        "<div style='margin-top:7px;color:#d9deeb;'>%5</div>"
        "<div style='margin-top:4px;color:#f5cb79;'>%6</div>")
        .arg(user.value("displayName").toString().toHtmlEscaped(),
            platform == "youtube" ? "#ff828e" : "#60ded5",
            platform == "youtube" ? "YOUTUBE" : "TIKTOK",
            badges.join(" · "), body, payment.toHtmlEscaped(),
            QDateTime::fromMSecsSinceEpoch(static_cast<qint64>(event.value("timestamp").toDouble())).toString("HH:mm:ss"));
}

void prepare(QTextDocument &document, const QJsonObject &event, const QFont &font, int width)
{
    document.setDefaultFont(font);
    document.setDocumentMargin(0);
    document.setHtml(content(event));
    document.setTextWidth(std::max(100, width));
}
}

ChatDelegate::ChatDelegate(QObject *parent) : QStyledItemDelegate(parent) {}

QSize ChatDelegate::sizeHint(const QStyleOptionViewItem &option, const QModelIndex &index) const
{
    const auto *view = qobject_cast<const QAbstractItemView *>(parent());
    const int width = view ? view->viewport()->width() : option.rect.width();
    QTextDocument document;
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
    QTextDocument document;
    prepare(document, event, option.font, card.width() - 76);
    painter->translate(card.left() + 52, card.top() + 13);
    document.drawContents(painter, QRectF(0, 0, card.width() - 62, card.height() - 22));
    painter->restore();
}
