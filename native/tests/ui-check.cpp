#include <QApplication>
#include <QListWidget>
#include <QJsonObject>
#include <QJsonArray>
#include <QStyleOptionViewItem>
#include <QImageReader>
#include <QBuffer>
#include <QMovie>
#include <QUrl>
#include <QSslSocket>
#include <iostream>
#include "../src/dock/chat-delegate.hpp"

int main(int argc, char **argv)
{
    QApplication application(argc, argv);
    if (!QSslSocket::supportsSsl()) {
        std::cerr << "HTTPS media transport is unavailable\n";
        return 1;
    }
    const auto formats = QImageReader::supportedImageFormats();
    if (!formats.contains("jpeg") || !formats.contains("webp")) {
        std::cerr << "JPEG/WebP media decoder is unavailable\n";
        return 1;
    }
    if (!MediaCache::allowed(QUrl("https://yt3.ggpht.com/photo.jpg"))
        || MediaCache::allowed(QUrl("https://127.0.0.1/private"))
        || MediaCache::allowed(QUrl("https://tiktokcdn.com.evil.invalid/image.gif"))
        || MediaCache::allowed(QUrl("http://yt3.ggpht.com/photo.jpg"))) {
        std::cerr << "Media URL boundary failed\n";
        return 1;
    }

    QBuffer gif;
    gif.setData(QByteArray::fromBase64("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"));
    gif.open(QIODevice::ReadOnly);
    QMovie movie(&gif, "gif");
    if (!movie.isValid() || !movie.jumpToFrame(0) || movie.currentImage().isNull()) {
        std::cerr << "GIF decoder is unavailable\n";
        return 1;
    }

    QListWidget timeline;
    timeline.resize(320, 500);
    auto *delegate = new ChatDelegate(&timeline);
    timeline.setItemDelegate(delegate);
    QJsonObject event{
        {"id", "test"}, {"platform", "youtube"}, {"type", "message"}, {"timestamp", 0},
        {"user", QJsonObject{{"displayName", "ผู้ชม <b>plain text</b>"}}},
        {"message", "Hello"}
    };
    auto *item = new QListWidgetItem(&timeline);
    item->setData(Qt::UserRole + 2, event);
    const auto index = timeline.model()->index(0, 0);
    QStyleOptionViewItem option;
    option.font = timeline.font();
    option.rect = QRect(0, 0, 320, 500);
    const auto shortSize = delegate->sizeHint(option, index);
    event.insert("message", QString("ข้อความยาวที่ต้องตัดบรรทัด <img src='file:///private'> ").repeated(20));
    item->setData(Qt::UserRole + 2, event);
    const auto longSize = delegate->sizeHint(option, index);
    if (shortSize.height() < 88 || longSize.height() <= shortSize.height()) {
        std::cerr << "Wrapped card layout failed\n";
        return 1;
    }
    // sizeHint must not initiate a remote image request during bulk layout.
    event.insert("message", "Gift");
    event.insert("media", QJsonObject{{"imageUrl", "https://p16-webcast.tiktokcdn.com/gift.gif"}});
    item->setData(Qt::UserRole + 2, event);
    if (delegate->sizeHint(option, index).height() <= shortSize.height()) {
        std::cerr << "Gift image space was not reserved\n";
        return 1;
    }
    std::cout << "Native URL, GIF codec and wrapped-card checks passed\n";
    return 0;
}
