#include "chat-dock.hpp"
#include "readable-checkbox.hpp"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QGroupBox>
#include <QFileDialog>
#include <QMessageBox>
#include <QApplication>
#include <QClipboard>
#include <QUrl>
#include <QSettings>
#include <obs.h>
#include <obs-frontend-api.h>

static constexpr const char *alertsSourceName = "Multi Live Chat · Alerts";

void ChatDock::createAlertControls(QVBoxLayout *layout)
{
    auto *group = new QGroupBox("TikTok gift & follow alerts");
    auto *form = new QFormLayout(group);
    form->setRowWrapPolicy(QFormLayout::WrapAllRows);
    alertsEnabled = new ReadableCheckBox("Enable animated alerts");
    alertsEnabled->setChecked(true);
    giftAlerts = new ReadableCheckBox("Gift alerts · after each combo");
    giftAlerts->setChecked(true);
    followAlerts = new ReadableCheckBox("New follower alerts");
    followAlerts->setChecked(true);
    form->addRow(alertsEnabled);
    form->addRow(giftAlerts);
    form->addRow(followAlerts);
    alertSeconds = new QSpinBox;
    alertSeconds->setRange(2, 15);
    alertSeconds->setValue(5);
    alertSeconds->setSuffix(" seconds");
    form->addRow("Display duration", alertSeconds);
    alertAudio = new QComboBox;
    alertAudio->addItem("Off · ปิดเสียง", "off");
    alertAudio->addItem("Stream only · ออกสตรีม", "stream");
    alertAudio->addItem("Listen only · ฟังเอง", "monitor");
    alertAudio->addItem("Stream & listen · ทั้งสองฝั่ง", "both");
    alertAudio->setCurrentIndex(1);
    form->addRow("Audio output", alertAudio);
    alertVolume = new QSpinBox;
    alertVolume->setRange(0, 100);
    alertVolume->setValue(60);
    alertVolume->setSuffix(" %");
    form->addRow("Alert volume", alertVolume);
    auto *audioHint = new QLabel("Use the Alerts source in your active scene. Listening uses OBS's monitoring device; choose it in OBS Settings → Audio.");
    audioHint->setWordWrap(true);
    audioHint->setObjectName("muted");
    form->addRow(audioHint);
    const auto addSound = [this, form](const QString &title, const QString &kind, QLabel *&label) {
        label = new QLabel("Default tone");
        label->setTextFormat(Qt::PlainText);
        label->setWordWrap(true);
        form->addRow(title, label);
        auto *buttons = new QHBoxLayout;
        auto *choose = new QPushButton("Choose sound");
        auto *reset = new QPushButton("Default");
        auto *test = new QPushButton("Test");
        buttons->addWidget(choose);
        buttons->addWidget(reset);
        buttons->addWidget(test);
        form->addRow(buttons);
        connect(choose, &QPushButton::clicked, this, [this, kind] {
            if (!bridgeConnected) {
                statusLabel->setText("Start the bridge before choosing a sound");
                return;
            }
            const auto path = QFileDialog::getOpenFileName(this, "Choose alert sound · up to 2 MB", {}, "Audio (*.wav *.mp3)");
            if (!path.isEmpty()) {
                bridge.command("sound", {{"action", "load"}, {"type", kind}, {"path", path}});
            }
        });
        connect(reset, &QPushButton::clicked, this, [this, kind] {
            bridge.command("sound", {{"action", "clear"}, {"type", kind}});
        });
        connect(test, &QPushButton::clicked, this, [this, kind] {
            if (!bridgeConnected || !configureAlertsSource(false)) {
                statusLabel->setText("Start the bridge and add the Alerts source before testing");
                return;
            }
            saveSettings();
            bridge.command("testAlert", {{"type", kind}});
        });
    };
    addSound("Gift sound · Sparkle", "gift", giftSound);
    addSound("Follow sound · Welcome", "follow", followSound);
    alertsUrl = new QLineEdit;
    alertsUrl->setReadOnly(true);
    form->addRow("Local alerts URL", alertsUrl);
    auto *copy = new QPushButton("Copy alerts URL");
    connect(copy, &QPushButton::clicked, this, [this] {
        QApplication::clipboard()->setText(alertsUrl->text());
    });
    form->addRow(copy);
    auto *add = new QPushButton("Add / update Alerts source");
    connect(add, &QPushButton::clicked, this, [this] {
        saveSettings();
        configureAlertsSource(true);
    });
    form->addRow(add);
    layout->addWidget(group);
}

void ChatDock::createSharingControls(QVBoxLayout *layout)
{
    auto *group = new QGroupBox("Read chat on your phone · อ่านแชทบนมือถือ");
    auto *form = new QFormLayout(group);
    form->setRowWrapPolicy(QFormLayout::WrapAllRows);
    auto *hint = new QLabel("Off until you enable sharing. Your private link is read-only and stays the same until Reset link. Works across networks through docks.54621325.xyz.");
    hint->setWordWrap(true);
    hint->setObjectName("muted");
    form->addRow(hint);
    sharingStatus = new QLabel("Mobile sharing is off");
    sharingStatus->setTextFormat(Qt::PlainText);
    sharingStatus->setWordWrap(true);
    form->addRow(sharingStatus);
    sharingStart = new QPushButton("Enable sharing / generate link");
    sharingStart->setEnabled(false);
    sharingStop = new QPushButton("Stop sharing");
    sharingReset = new QPushButton("Reset link");
    sharingStop->setEnabled(false);
    sharingReset->setEnabled(false);
    form->addRow(sharingStart);
    auto *actions = new QHBoxLayout;
    actions->addWidget(sharingStop);
    actions->addWidget(sharingReset);
    form->addRow(actions);
    sharingAutoStart = new ReadableCheckBox("Automatically share when OBS opens");
    sharingAutoStart->setEnabled(false);
    form->addRow(sharingAutoStart);
    sharingUrl = new QLineEdit;
    sharingUrl->setReadOnly(true);
    sharingUrl->setPlaceholderText("Enable sharing to create your private link");
    form->addRow("Private mobile URL", sharingUrl);
    auto *copy = new QPushButton("Copy private mobile link");
    form->addRow(copy);
    connect(copy, &QPushButton::clicked, this, [this] {
        QApplication::clipboard()->setText(sharingUrl->text());
    });
    sharingQr = new QLabel;
    sharingQr->setAlignment(Qt::AlignCenter);
    sharingQr->setMaximumSize(230, 230);
    sharingQr->setToolTip("Private read-only link · anyone with this QR can read your shared chat");
    sharingQr->hide();
    form->addRow(sharingQr);
    connect(sharingStart, &QPushButton::clicked, this, [this] {
        if (!bridgeConnected) {
            statusLabel->setText("Start the bridge first");
            return;
        }
        bool consent = false;
        if (!sharingConsented) {
            const auto answer = QMessageBox::question(this, "Enable mobile chat sharing?",
                "เปิดแชร์แชทไปมือถือ?\n\n"
                "ข้อความล่าสุดและข้อความใหม่ ชื่อ รูปโปรไฟล์ และข้อมูลของขวัญ/ติดตาม จะส่งผ่าน docks.54621325.xyz\n"
                "คนที่มีลิงก์อ่านได้อย่างเดียว ไม่สามารถควบคุม OBS หรือเปลี่ยน Settings ได้\n"
                "ไม่มีการส่งรหัสผ่าน คุกกี้ หรือข้อมูลล็อกอิน และไม่เก็บข้อความแชทถาวร\n"
                "หยุดแชร์หรือ Reset link ได้ทุกเมื่อ การเริ่มแชร์อัตโนมัติเป็นตัวเลือกแยก\n\n"
                "Enable read-only sharing of recent/new chat, names, profile images and gift/follow events?",
                QMessageBox::Yes | QMessageBox::No, QMessageBox::No);
            if (answer != QMessageBox::Yes) {
                return;
            }
            consent = true;
        }
        bridge.command("sharing", {{"action", "start"}, {"consent", consent}});
    });
    connect(sharingStop, &QPushButton::clicked, this, [this] {
        sharingAutoStart->setChecked(false);
        bridge.command("sharing", {{"action", "stop"}});
    });
    connect(sharingReset, &QPushButton::clicked, this, [this] {
        if (QMessageBox::question(this, "Reset private link?",
            "ลิงก์และ QR เดิมจะใช้ไม่ได้ทันที มือถือที่เชื่อมอยู่จะถูกตัดสิทธิ์\n"
            "Existing links will stop working. Reset now?",
            QMessageBox::Yes | QMessageBox::No, QMessageBox::No) == QMessageBox::Yes) {
            bridge.command("sharing", {{"action", "reset"}});
        }
    });
    layout->addWidget(group);
}

bool ChatDock::configureAlertsSource(bool create, bool applyAudio)
{
    const QUrl url(alertsUrl->text());
    if (url.scheme() != "http" || url.host() != "127.0.0.1" || url.path() != "/alerts") {
        if (create) {
            statusLabel->setText("Start the bridge before adding Alerts");
        }
        return false;
    }
    QSettings local("OBSUnifiedChat", "NativeDock");
    const auto uuid = local.value("alertsSourceUuid").toString().toUtf8();
    auto *source = uuid.isEmpty() ? nullptr : obs_get_source_by_uuid(uuid.constData());
    if (!source) {
        source = obs_get_source_by_name(alertsSourceName);
    }
    bool created = false;
    if (source) {
        auto *privateData = obs_source_get_private_settings(source);
        const bool owned = obs_data_get_bool(privateData, "crafopsAlerts");
        obs_data_release(privateData);
        if (!owned || QString::fromUtf8(obs_source_get_unversioned_id(source)) != "browser_source") {
            obs_source_release(source);
            if (create) {
                statusLabel->setText("Another source uses the Alerts name; rename it first");
            }
            return false;
        }
    } else if (create) {
        auto *data = obs_data_create();
        const auto encoded = alertsUrl->text().toUtf8();
        obs_data_set_string(data, "url", encoded.constData());
        obs_data_set_int(data, "width", 800);
        obs_data_set_int(data, "height", 300);
        obs_data_set_bool(data, "reroute_audio", true);
        obs_data_set_bool(data, "shutdown", false);
        obs_data_set_bool(data, "restart_when_active", false);
        obs_data_set_bool(data, "fps_custom", true);
        obs_data_set_int(data, "fps", 30);
        obs_data_set_int(data, "webpage_control_level", 0);
        source = obs_source_create("browser_source", alertsSourceName, data, nullptr);
        obs_data_release(data);
        if (!source) {
            statusLabel->setText("OBS Browser Source is unavailable");
            return false;
        }
        auto *privateData = obs_source_get_private_settings(source);
        obs_data_set_bool(privateData, "crafopsAlerts", true);
        obs_data_release(privateData);
        created = true;
    } else {
        return false;
    }
    auto *data = obs_source_get_settings(source);
    const auto encoded = alertsUrl->text().toUtf8();
    if (QString::fromUtf8(obs_data_get_string(data, "url")) != alertsUrl->text()
        || !obs_data_get_bool(data, "reroute_audio")) {
        obs_data_set_string(data, "url", encoded.constData());
        obs_data_set_bool(data, "reroute_audio", true);
        obs_source_update(source, data);
    }
    obs_data_release(data);
    const auto mode = alertAudio->currentData().toString();
    auto *privateData = obs_source_get_private_settings(source);
    const auto previousMode = QString::fromUtf8(obs_data_get_string(privateData, "lastAlertMode"));
    if (created || applyAudio || mode != previousMode) {
        const auto monitoring = mode == "monitor" ? OBS_MONITORING_TYPE_MONITOR_ONLY
            : mode == "both" ? OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT : OBS_MONITORING_TYPE_NONE;
        obs_source_set_monitoring_type(source, monitoring);
        obs_source_set_muted(source, mode == "off");
        const auto encodedMode = mode.toUtf8();
        obs_data_set_string(privateData, "lastAlertMode", encodedMode.constData());
    }
    obs_data_release(privateData);
    if (created) {
        obs_source_set_volume(source, 1.0f);
    }
    if (create) {
        local.setValue("alertsSourceUuid", QString::fromUtf8(obs_source_get_uuid(source)));
        auto *sceneSource = obs_frontend_get_current_scene();
        auto *scene = sceneSource ? obs_scene_from_source(sceneSource) : nullptr;
        if (scene && !obs_scene_find_source(scene, obs_source_get_name(source))) {
            obs_scene_add(scene, source);
        }
        obs_source_release(sceneSource);
        statusLabel->setText(scene ? "Alerts source ready; use Test to check picture and sound" : "Open a scene before adding Alerts");
    }
    obs_source_release(source);
    return true;
}

void ChatDock::refreshAlertsSource()
{
    configureAlertsSource(false);
}
