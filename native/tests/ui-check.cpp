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
#include <QMainWindow>
#include <QDockWidget>
#include <QSettings>
#include <QTemporaryDir>
#include <QTabWidget>
#include <QGroupBox>
#include "../src/dock/chat-dock.hpp"
#include <iostream>
#include "../src/dock/chat-delegate.hpp"
#include "../src/dock/readable-checkbox.hpp"

int main(int argc, char **argv)
{
    std::cerr << "Creating Qt application" << std::endl;
    QApplication application(argc, argv);
    QTemporaryDir settingsDirectory;
    if (!settingsDirectory.isValid()) {
        std::cerr << "Cannot isolate Settings check\n";
        return 1;
    }
    QSettings::setDefaultFormat(QSettings::IniFormat);
    QSettings::setPath(QSettings::IniFormat, QSettings::UserScope, settingsDirectory.path());
    {
        QSettings settings("OBSUnifiedChat", "NativeDock");
        settings.setValue("startWithObs", false);
        settings.setValue("autoUpdate", false);
        settings.sync();
    }
    std::cerr << "Checking complete Dock Settings" << std::endl;
    {
        ChatDock dock;
        dock.resize(390, 800);
        auto *tabs = dock.findChild<QTabWidget *>();
        if (!tabs || tabs->count() != 3) {
            std::cerr << "Dock tabs are missing\n";
            return 1;
        }
        tabs->setCurrentIndex(2);
        dock.show();
        application.processEvents();
        bool alertsFound = false;
        bool sharingFound = false;
        for (const auto *group : dock.findChildren<QGroupBox *>()) {
            alertsFound |= group->title() == "TikTok gift & follow alerts";
            sharingFound |= group->title().startsWith("Read chat on your phone");
        }
        if (!alertsFound || !sharingFound) {
            std::cerr << "Alert or mobile Settings group is missing\n";
            return 1;
        }
        dock.grab().save("native-ui-settings.png");
        for (const auto *checkbox : dock.findChildren<QCheckBox *>()) {
            if (checkbox->text() == "Automatically share when OBS opens"
                && (checkbox->isChecked() || checkbox->isEnabled())) {
                std::cerr << "Sharing starts without consent\n";
                return 1;
            }
        }
        dock.shutdown();
    }
    {
        ReadableCheckBox checkbox("Alerts");
        checkbox.resize(180, 40);
        checkbox.setStyleSheet(R"(
            QCheckBox::indicator {
                width: 20px;
                height: 20px;
                border: 1px solid #56647f;
                background: #131824;
            }
            QCheckBox::indicator:checked {
                background: #8599f5;
            }
        )");
        checkbox.setChecked(true);
        QImage image(checkbox.size(), QImage::Format_ARGB32);
        image.fill(Qt::transparent);
        checkbox.render(&image);
        image.save("native-ui-checkbox.png");
        int tickPixels = 0;
        for (int y = 10; y < 30; ++y) {
            for (int x = 0; x < 20; ++x) {
                const auto pixel = image.pixelColor(x, y);
                if (pixel.red() < 40 && pixel.green() < 45 && pixel.blue() < 55 && pixel.alpha() > 200) {
                    ++tickPixels;
                }
            }
        }
        if (tickPixels < 10) {
            std::cerr << "Checkbox checkmark is not visible\n";
            return 1;
        }
    }
    std::cerr << "Checking dock layout restoration" << std::endl;
    {
        QMainWindow previous;
        auto *savedDock = new QDockWidget("Chat", &previous);
        savedDock->setObjectName("obs-unified-live-chat");
        savedDock->setWidget(new QWidget);
        previous.addDockWidget(Qt::LeftDockWidgetArea, savedDock);
        previous.show();
        savedDock->show();
        application.processEvents();
        const auto state = previous.saveState();

        QMainWindow reopened;
        auto *restoredDock = new QDockWidget("Chat", &reopened);
        restoredDock->setObjectName("obs-unified-live-chat");
        restoredDock->setWidget(new QWidget);
        reopened.addDockWidget(Qt::RightDockWidgetArea, restoredDock);
        restoredDock->hide();
        restoredDock->setFloating(true);
        if (!reopened.restoreState(state) || restoredDock->isHidden() || restoredDock->isFloating()
            || reopened.dockWidgetArea(restoredDock) != Qt::LeftDockWidgetArea) {
            std::cerr << "Dock visibility and placement restoration failed\n";
            return 1;
        }
        savedDock->hide();
        if (!reopened.restoreState(previous.saveState()) || !restoredDock->isHidden()) {
            std::cerr << "Intentionally hidden dock was reopened\n";
            return 1;
        }
    }
    std::cerr << "Checking HTTPS" << std::endl;
    if (!QSslSocket::supportsSsl()) {
        std::cerr << "HTTPS media transport is unavailable\n";
        return 1;
    }
    const auto formats = QImageReader::supportedImageFormats();
    std::cerr << "Checking image codecs" << std::endl;
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
    gif.setData(QByteArray::fromHex(
        "47494638396101000100800000000000ffffff"
        "21f90401000000002c00000000010001000002024401003b"));
    gif.open(QIODevice::ReadOnly);
    QMovie movie(&gif, "gif");
    std::cerr << "Checking GIF frame" << std::endl;
    if (!movie.isValid() || !movie.jumpToFrame(0) || movie.currentImage().isNull()) {
        std::cerr << "GIF decoder is unavailable\n";
        return 1;
    }

    QListWidget timeline;
    std::cerr << "Checking wrapped card layout" << std::endl;
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
