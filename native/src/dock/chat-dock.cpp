#include "chat-dock.hpp"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QTabWidget>
#include <QScrollArea>
#include <QJsonArray>
#include <QDesktopServices>
#include <QUrl>
#include <QDateTime>
#include <QScrollBar>
#include <QSignalBlocker>
#include <QClipboard>
#include <QApplication>
#include <QSettings>
#include <QColor>
#include <algorithm>
#include <QGroupBox>
#include <QFrame>
#include <QFont>
#include <QFileDialog>
#include <QFile>
#include <QDir>
#include <QCoreApplication>
#include <obs.h>
#include <windows.h>
#include "chat-delegate.hpp"
#include "readable-checkbox.hpp"
#include <QEvent>
#include <QPixmap>
#include <QFontMetrics>

ChatDock::ChatDock(QWidget *parent) : QWidget(parent), bridge(this)
{
    setObjectName("unifiedChat");
    setMinimumSize(300, 360);
    auto interfaceFont = font();
    interfaceFont.setPointSize(10);
    setFont(interfaceFont);
    setStyleSheet(R"(
        QWidget {
            color: #e5eaf5;
            font-family: 'Segoe UI', 'Tahoma';
        }
        QWidget#unifiedChat, QScrollArea, QScrollArea > QWidget > QWidget {
            background: #131720;
        }
        QLabel {
            background: transparent;
        }
        QLabel#brand {
            font-size: 19px;
            font-weight: 700;
            color: #f4f6fb;
        }
        QLabel#muted, QLabel#status {
            color: #929db3;
            font-size: 11px;
        }
        QLabel#empty {
            color: #929db3;
            padding: 24px 10px;
            font-size: 13px;
        }
        QGroupBox {
            background: #1a1f2b;
            border: 1px solid #2e3546;
            border-radius: 10px;
            margin-top: 14px;
            padding: 14px 10px 10px;
            font-weight: 600;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 14px;
            padding: 0 5px;
            color: #cdd6ea;
        }
        QTabWidget::pane {
            border: none;
            background: transparent;
        }
        QTabBar::tab {
            background: transparent;
            color: #929db3;
            border-bottom: 2px solid transparent;
            padding: 10px 14px;
            margin-right: 4px;
        }
        QTabBar::tab:selected {
            color: #e9eeff;
            border-bottom: 2px solid #899dff;
        }
        QTabBar::tab:hover {
            color: #e9eeff;
            background: #202636;
        }
        QLineEdit, QComboBox, QSpinBox {
            background: #131824;
            border: 1px solid #343d52;
            border-radius: 7px;
            padding: 8px;
            selection-background-color: #5064a0;
        }
        QLineEdit:focus, QComboBox:focus, QSpinBox:focus {
            border-color: #899dff;
        }
        QComboBox::drop-down {
            border: none;
            width: 22px;
        }
        QPushButton {
            background: #252d3e;
            border: 1px solid #3a455d;
            border-radius: 7px;
            padding: 8px 12px;
            font-weight: 600;
        }
        QPushButton:hover {
            background: #333f58;
            border-color: #67799f;
        }
        QPushButton:pressed {
            background: #1e2638;
        }
        QPushButton#primary {
            background: #8599f5;
            color: #111626;
            border: 1px solid #9aacff;
        }
        QPushButton#primary:hover {
            background: #a0b0ff;
        }
        QPushButton:disabled, QLineEdit:disabled {
            color: #68748c;
        }
        QCheckBox {
            spacing: 8px;
            padding: 4px 0;
        }
        QCheckBox::indicator {
            width: 20px;
            height: 20px;
            border: 1px solid #56647f;
            border-radius: 4px;
            background: #131824;
        }
        QCheckBox::indicator:checked {
            background: #8599f5;
            border-color: #a2b2ff;
        }
        QListWidget {
            background: #131720;
            border: none;
            outline: none;
        }
        QScrollArea {
            border: none;
        }
        QScrollBar:vertical {
            background: transparent;
            width: 7px;
            margin: 0;
        }
        QScrollBar::handle:vertical {
            background: #3a465e;
            border-radius: 3px;
            min-height: 30px;
        }
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
            height: 0;
        }
        QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
            background: transparent;
        }
    )");
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(12, 14, 12, 10);
    layout->setSpacing(10);
    auto *brand = new QLabel("Multi Live Chat");
    brand->setObjectName("brand");
    layout->addWidget(brand);
    auto *credit = new QLabel(QString("by @CrafOps · v%1").arg(UNIFIED_CHAT_VERSION));
    credit->setObjectName("muted");
    layout->addWidget(credit);
    auto *connections = new QHBoxLayout;
    youtubeStatus = new QLabel("● YouTube");
    tiktokStatus = new QLabel("● TikTok");
    youtubeStatus->setObjectName("muted");
    tiktokStatus->setObjectName("muted");
    youtubeStatus->setWordWrap(false);
    tiktokStatus->setWordWrap(false);
    youtubeStatus->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    tiktokStatus->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    connections->addWidget(youtubeStatus);
    connections->addWidget(tiktokStatus);
    connections->addStretch();
    layout->addLayout(connections);
    statusLabel = new QLabel("Starting local bridge");
    statusLabel->setWordWrap(true);
    statusLabel->setTextFormat(Qt::PlainText);
    statusLabel->setObjectName("status");
    auto *tabs = new QTabWidget;
    layout->addWidget(tabs, 1);
    layout->addWidget(statusLabel);

    auto *accounts = new QWidget;
    auto *accountLayout = new QVBoxLayout(accounts);
    accountLayout->setContentsMargins(0, 8, 0, 0);
    accountLayout->setSpacing(14);
    auto *youtubeGroup = new QGroupBox("YouTube");
    auto *youtubeLayout = new QVBoxLayout(youtubeGroup);
    youtubeLayout->setSpacing(9);
    accountLayout->addWidget(youtubeGroup);
    youtubeLabel = new QLabel("Paste a LIVE link to get started");
    youtubeLabel->setWordWrap(true);
    youtubeLabel->setTextFormat(Qt::PlainText);
    youtubeLabel->setObjectName("muted");
    youtubeLayout->addWidget(youtubeLabel);
    auto *login = new QPushButton("Login with YouTube");
    auto *logout = new QPushButton("Logout YouTube");
    broadcasts = new QComboBox;
    youtubeLiveUrl = new QLineEdit;
    youtubeLiveUrl->setMaxLength(2048);
    youtubeLiveUrl->setPlaceholderText("YouTube LIVE ID or URL (read-only)");
    youtubeLayout->addWidget(youtubeLiveUrl);
    auto *readOnlyHint = new QLabel("Read-only public chat · No login or API key needed");
    readOnlyHint->setWordWrap(true);
    readOnlyHint->setObjectName("muted");
    youtubeLayout->addWidget(readOnlyHint);
    auto *advancedAccount = new QPushButton("Account options");
    advancedAccount->setCheckable(true);
    youtubeLayout->addWidget(advancedAccount);
    auto *accountOptions = new QWidget;
    auto *optionLayout = new QVBoxLayout(accountOptions);
    optionLayout->setContentsMargins(0, 0, 0, 0);
    auto *loginActions = new QHBoxLayout;
    loginActions->addWidget(login);
    loginActions->addWidget(logout);
    optionLayout->addLayout(loginActions);
    optionLayout->addWidget(broadcasts);
    autoDetect = new ReadableCheckBox("Auto-detect my broadcasts");
    autoDetect->setChecked(true);
    optionLayout->addWidget(autoDetect);
    youtubeLayout->addWidget(accountOptions);
    accountOptions->hide();
    connect(advancedAccount, &QPushButton::toggled, accountOptions, &QWidget::setVisible);
    auto *tiktokGroup = new QGroupBox("TikTok");
    auto *tiktokLayout = new QVBoxLayout(tiktokGroup);
    tiktokLayout->setSpacing(9);
    accountLayout->addWidget(tiktokGroup);
    tiktokLabel = new QLabel("Connect a creator who is LIVE");
    tiktokLabel->setWordWrap(true);
    tiktokLabel->setTextFormat(Qt::PlainText);
    tiktokLabel->setObjectName("muted");
    tiktokLayout->addWidget(tiktokLabel);
    username = new QLineEdit;
    username->setPlaceholderText("TikTok username (with or without @)");
    tiktokLayout->addWidget(username);
    tiktokEnabled = new ReadableCheckBox("Enable TikTok chat (unofficial)");
    tiktokLayout->addWidget(tiktokEnabled);
    auto *applyAccounts = new QPushButton("Connect sources");
    applyAccounts->setObjectName("primary");
    auto *refresh = new QPushButton("Refresh");
    auto *accountActions = new QHBoxLayout;
    accountActions->addWidget(applyAccounts, 1);
    accountActions->addWidget(refresh);
    accountLayout->addLayout(accountActions);
    accountLayout->addStretch();
    auto *accountScroll = new QScrollArea;
    accountScroll->setWidgetResizable(true);
    accountScroll->setWidget(accounts);
    tabs->addTab(accountScroll, "Accounts");

    auto *chat = new QWidget;
    auto *chatLayout = new QVBoxLayout(chat);
    chatLayout->setContentsMargins(0, 10, 0, 0);
    chatLayout->setSpacing(8);
    auto *filters = new QHBoxLayout;
    search = new QLineEdit;
    search->setPlaceholderText("Search messages");
    platform = new QComboBox;
    platform->addItems({"All", "YouTube", "TikTok"});
    filters->addWidget(search, 1);
    filters->addWidget(platform);
    chatLayout->addLayout(filters);
    timeline = new QListWidget;
    timeline->setWordWrap(true);
    timeline->setSelectionMode(QAbstractItemView::NoSelection);
    timeline->setItemDelegate(new ChatDelegate(timeline));
    timeline->setResizeMode(QListView::Adjust);
    timeline->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    timeline->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    comboNotice = new QLabel(timeline->viewport());
    comboNotice->setObjectName("comboNotice");
    comboNotice->setTextFormat(Qt::PlainText);
    comboNotice->setWordWrap(true);
    comboNotice->setAttribute(Qt::WA_TransparentForMouseEvents);
    comboNotice->setStyleSheet(R"(
        QLabel#comboNotice {
            background: #332b20;
            color: #ffdb9f;
            border: 1px solid #b99255;
            border-radius: 7px;
            padding: 8px;
            font-size: 11px;
        }
    )");
    comboNotice->hide();
    timeline->viewport()->installEventFilter(this);
    emptyState = new QLabel("Your chat, in one place\n\nConnect YouTube or TikTok in Accounts.\nNew messages will appear here.");
    emptyState->setObjectName("empty");
    emptyState->setAlignment(Qt::AlignCenter);
    emptyState->setWordWrap(true);
    chatLayout->addWidget(emptyState);
    chatLayout->addWidget(timeline, 1);
    auto *tools = new QHBoxLayout;
    autoScroll = new ReadableCheckBox("Auto-scroll");
    autoScroll->setChecked(true);
    auto *clear = new QPushButton("Clear");
    tools->addWidget(autoScroll);
    messageCount = new QLabel("0 messages");
    messageCount->setObjectName("muted");
    tools->addStretch();
    tools->addWidget(messageCount);
    tools->addWidget(clear);
    chatLayout->addLayout(tools);
    auto *replyLayout = new QHBoxLayout;
    reply = new QLineEdit;
    reply->setMaxLength(200);
    reply->setPlaceholderText("Reply to YouTube LIVE · Enter to send");
    sendButton = new QPushButton("Send");
    sendButton->setEnabled(false);
    reply->hide();
    sendButton->hide();
    replyLayout->addWidget(reply, 1);
    replyLayout->addWidget(sendButton);
    chatLayout->addLayout(replyLayout);
    tabs->addTab(chat, "Chat");
    tabs->setCurrentWidget(chat);

    QSettings local("OBSUnifiedChat", "NativeDock");
    auto *settingsWidget = new QWidget;
    auto *settingsLayout = new QVBoxLayout(settingsWidget);
    settingsLayout->setContentsMargins(0, 8, 0, 0);
    settingsLayout->setSpacing(14);
    auto *runtimeGroup = new QGroupBox("Workspace & startup");
    auto *form = new QFormLayout(runtimeGroup);
    form->setRowWrapPolicy(QFormLayout::WrapAllRows);
    form->setVerticalSpacing(9);
    settingsLayout->addWidget(runtimeGroup);
    rootPath = new QLineEdit(local.value("bridgeRoot").toString());
    nodePath = new QLineEdit(local.value("nodePath", "C:/Program Files/nodejs/node.exe").toString());
    clientId = new QLineEdit(local.value("youtubeClientId").toString());
    clientSecret = new QLineEdit(local.value("youtubeClientSecret").toString());
    clientSecret->setEchoMode(QLineEdit::Password);
    apiKey = new QLineEdit(local.value("youtubeApiKey").toString());
    apiKey->setEchoMode(QLineEdit::Password);
    auto *folderRow = new QHBoxLayout;
    auto *browseFolder = new QPushButton("Browse");
    folderRow->addWidget(rootPath, 1);
    folderRow->addWidget(browseFolder);
    form->addRow("Package folder", folderRow);
    auto *nodeRow = new QHBoxLayout;
    auto *browseNode = new QPushButton("Browse");
    nodeRow->addWidget(nodePath, 1);
    nodeRow->addWidget(browseNode);
    form->addRow("Node executable", nodeRow);
    connect(browseFolder, &QPushButton::clicked, this, [this] {
        const auto path = QFileDialog::getExistingDirectory(this, "Choose package folder", rootPath->text());
        if (!path.isEmpty()) {
            rootPath->setText(path);
        }
    });
    connect(browseNode, &QPushButton::clicked, this, [this] {
        const auto path = QFileDialog::getOpenFileName(this, "Choose Node executable", nodePath->text(), "Node executable (node.exe)");
        if (!path.isEmpty()) {
            nodePath->setText(path);
        }
    });
    startWithObs = new ReadableCheckBox("Start bridge with OBS");
    startWithObs->setChecked(local.value("startWithObs", true).toBool());
    autoReconnect = new ReadableCheckBox("Reconnect platform sessions");
    autoReconnect->setChecked(true);
    form->addRow(startWithObs);
    autoUpdate = new ReadableCheckBox("Automatically update when OBS closes");
    autoUpdate->setChecked(local.value("autoUpdate", true).toBool());
    autoUpdate->setToolTip("Checks GitHub Releases at startup; installs verified updates after OBS exits.");
    form->addRow(autoUpdate);
    updateLabel = new QLabel("Updates are checked when OBS starts");
    updateLabel->setWordWrap(true);
    updateLabel->setObjectName("muted");
    form->addRow(updateLabel);
    form->addRow(autoReconnect);
    auto *displayGroup = new QGroupBox("Chat appearance");
    auto *displayForm = new QFormLayout(displayGroup);
    displayForm->setRowWrapPolicy(QFormLayout::WrapAllRows);
    settingsLayout->addWidget(displayGroup);
    messageLimit = new QSpinBox;
    messageLimit->setRange(50, 2000);
    messageLimit->setValue(500);
    fontSize = new QSpinBox;
    fontSize->setRange(10, 28);
    fontSize->setValue(13);
    overlayLimit = new QSpinBox;
    overlayLimit->setRange(1, 50);
    overlayLimit->setValue(8);
    overlaySeconds = new QSpinBox;
    overlaySeconds->setRange(5, 300);
    overlaySeconds->setValue(25);
    displayForm->addRow("Message limit", messageLimit);
    displayForm->addRow("Font size", fontSize);
    auto *overlayGroup = new QGroupBox("Browser Source overlay");
    auto *overlayForm = new QFormLayout(overlayGroup);
    overlayForm->setRowWrapPolicy(QFormLayout::WrapAllRows);
    settingsLayout->addWidget(overlayGroup);
    overlayForm->addRow("Visible messages", overlayLimit);
    overlayForm->addRow("Fade after (seconds)", overlaySeconds);
    overlayUrl = new QLineEdit;
    overlayUrl->setReadOnly(true);
    overlayForm->addRow("Local overlay URL", overlayUrl);
    auto *copy = new QPushButton("Copy overlay URL");
    overlayForm->addRow(copy);
    viewerUrl = new QLineEdit;
    viewerUrl->setReadOnly(true);
    overlayForm->addRow("Local chat reader", viewerUrl);
    auto *copyReader = new QPushButton("Copy local reader URL");
    overlayForm->addRow(copyReader);
    connect(copyReader, &QPushButton::clicked, this, [this] {
        QApplication::clipboard()->setText(viewerUrl->text());
    });
    createAlertControls(settingsLayout);
    createSharingControls(settingsLayout);
    auto *credentialToggle = new QPushButton("Optional Google API / OAuth settings");
    credentialToggle->setCheckable(true);
    settingsLayout->addWidget(credentialToggle);
    auto *credentials = new QGroupBox("Google credentials · optional");
    auto *credentialForm = new QFormLayout(credentials);
    credentialForm->setRowWrapPolicy(QFormLayout::WrapAllRows);
    credentialForm->addRow("Desktop client ID", clientId);
    credentialForm->addRow("Desktop client secret", clientSecret);
    credentialForm->addRow("API Key (official reader)", apiKey);
    auto *credentialHint = new QLabel("Leave API Key empty for the public reader. Restart OBS after changing credentials.");
    credentialHint->setWordWrap(true);
    credentialHint->setObjectName("muted");
    credentialForm->addRow(credentialHint);
    settingsLayout->addWidget(credentials);
    credentials->hide();
    connect(credentialToggle, &QPushButton::toggled, credentials, &QWidget::setVisible);
    auto *save = new QPushButton("Save settings");
    auto *start = new QPushButton("Start bridge");
    save->setObjectName("primary");
    auto *settingsActions = new QHBoxLayout;
    settingsActions->addWidget(save, 1);
    settingsActions->addWidget(start);
    settingsLayout->addLayout(settingsActions);
    settingsLayout->addStretch();
    auto *scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setWidget(settingsWidget);
    tabs->addTab(scroll, "Settings");

    connect(&bridge, &BridgeClient::status, statusLabel, &QLabel::setText);
    connect(&bridge, &BridgeClient::received, this, &ChatDock::receive);
    connect(&bridge, &BridgeClient::connected, this, [this](bool connected) {
        bridgeConnected = connected;
        sharingStart->setEnabled(connected);
        sharingAutoStart->setEnabled(connected && sharingConsented);
        if (!connected) {
            activeCombos.clear();
            updateComboNotice();
            sharingStop->setEnabled(false);
            sharingReset->setEnabled(false);
        }
        sendButton->setEnabled(connected && canReply && pendingReply.isEmpty());
    });
    connect(login, &QPushButton::clicked, this, [this] {
        bridge.command("login");
    });
    connect(logout, &QPushButton::clicked, this, [this] {
        bridge.command("logout");
    });
    connect(refresh, &QPushButton::clicked, this, [this] {
        bridge.command("refresh");
    });
    connect(clear, &QPushButton::clicked, this, [this] {
        bridge.command("clear");
    });
    connect(save, &QPushButton::clicked, this, &ChatDock::saveSettings);
    connect(applyAccounts, &QPushButton::clicked, this, &ChatDock::saveSettings);
    connect(start, &QPushButton::clicked, this, [this] {
        saveSettings();
        bridge.start();
    });
    connect(copy, &QPushButton::clicked, this, [this] {
        QApplication::clipboard()->setText(overlayUrl->text());
    });
    connect(search, &QLineEdit::textChanged, this, &ChatDock::filter);
    connect(platform, qOverload<int>(&QComboBox::currentIndexChanged), this, &ChatDock::filter);
    connect(sendButton, &QPushButton::clicked, this, &ChatDock::sendReply);
    connect(reply, &QLineEdit::returnPressed, this, &ChatDock::sendReply);
    sendTimeout.setSingleShot(true);
    connect(&sendTimeout, &QTimer::timeout, this, [this] {
        pendingReply.clear();
        sendButton->setText("Send");
        sendButton->setEnabled(bridgeConnected && canReply);
        statusLabel->setText("Reply status unknown; check chat before sending again");
    });
    if (startWithObs->isChecked()) {
        QTimer::singleShot(0, &bridge, &BridgeClient::start);
    }
    const auto packageRoot = rootPath->text().trimmed();
    const auto updater = QDir(packageRoot).filePath("scripts/auto-update.ps1");
    if (autoUpdate->isChecked() && !packageRoot.isEmpty() && QFile::exists(updater)) {
        QProcess helper;
        wchar_t systemDirectory[MAX_PATH]{};
        GetSystemDirectoryW(systemDirectory, MAX_PATH);
        helper.setProgram(QDir(QString::fromWCharArray(systemDirectory))
            .filePath("WindowsPowerShell/v1.0/powershell.exe"));
        helper.setArguments({"-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-File", updater, "-PackageRoot", packageRoot,
            "-ObsRoot", QDir(QCoreApplication::applicationDirPath()).absoluteFilePath("../.."),
            "-ObsPid", QString::number(QCoreApplication::applicationPid()),
            "-ObsVersion", QString::fromUtf8(obs_get_version_string()), "-QtVersion", qVersion()});
        helper.setCreateProcessArgumentsModifier([](QProcess::CreateProcessArguments *arguments) {
            arguments->flags |= CREATE_NO_WINDOW;
        });
        if (!helper.startDetached()) {
            updateLabel->setText("Could not start automatic updater");
        }
        auto *updateTimer = new QTimer(this);
        connect(updateTimer, &QTimer::timeout, this, [this, packageRoot] {
            QFile status(QDir(packageRoot).filePath(".update-status.txt"));
            if (status.open(QIODevice::ReadOnly)) {
                updateLabel->setText(QString::fromUtf8(status.read(1024)).trimmed());
            }
        });
        updateTimer->start(5000);
    } else if (autoUpdate->isChecked()) {
        updateLabel->setText("Choose the new release package folder, then restart OBS to enable updates");
    }
}

void ChatDock::saveSettings()
{
    QSettings local("OBSUnifiedChat", "NativeDock");
    local.setValue("bridgeRoot", rootPath->text().trimmed());
    local.setValue("nodePath", nodePath->text().trimmed());
    local.setValue("youtubeClientId", clientId->text().trimmed());
    local.setValue("youtubeClientSecret", clientSecret->text().trimmed());
    local.setValue("youtubeApiKey", apiKey->text().trimmed());
    local.setValue("startWithObs", startWithObs->isChecked());
    local.setValue("autoUpdate", autoUpdate->isChecked());
    settings.insert("tiktokUsername", username->text().trimmed());
    settings.insert("tiktokEnabled", tiktokEnabled->isChecked());
    settings.insert("autoDetect", autoDetect->isChecked());
    settings.insert("autoReconnect", autoReconnect->isChecked());
    settings.insert("messageLimit", messageLimit->value());
    settings.insert("fontSize", fontSize->value());
    settings.insert("overlayLimit", overlayLimit->value());
    settings.insert("overlaySeconds", overlaySeconds->value());
    settings.insert("sharingAutoStart", sharingAutoStart->isChecked());
    settings.insert("alerts", QJsonObject{
        {"enabled", alertsEnabled->isChecked()}, {"gifts", giftAlerts->isChecked()},
        {"follows", followAlerts->isChecked()}, {"seconds", alertSeconds->value()},
        {"volume", alertVolume->value()}, {"audio", alertAudio->currentData().toString()}
    });
    settings.insert("youtubeBroadcastId", broadcasts->currentData().toString());
    settings.insert("youtubeLiveUrl", youtubeLiveUrl->text().trimmed());
    bridge.command("settings", {{"settings", settings}});
    configureAlertsSource(false, true);
}

void ChatDock::sendReply()
{
    if (!bridgeConnected || !canReply || !pendingReply.isEmpty() || reply->text().trimmed().isEmpty()) {
        return;
    }
    pendingReply = bridge.command("reply", {{"message", reply->text().trimmed()}});
    if (!pendingReply.isEmpty()) {
        sendButton->setEnabled(false);
        sendButton->setText("Sending…");
        sendTimeout.start(20000);
    }
}

void ChatDock::receive(const QJsonObject &message)
{
    const auto kind = message.value("kind").toString();
    if (kind == "snapshot" || kind == "settings") {
        settings = message.value("settings").toObject();
        youtubeLiveUrl->setText(settings.value("youtubeLiveUrl").toString());
        username->setText(settings.value("tiktokUsername").toString());
        tiktokEnabled->setChecked(settings.value("tiktokEnabled").toBool());
        autoDetect->setChecked(settings.value("autoDetect").toBool());
        autoReconnect->setChecked(settings.value("autoReconnect").toBool());
        messageLimit->setValue(settings.value("messageLimit").toInt(500));
        fontSize->setValue(settings.value("fontSize").toInt(13));
        overlayLimit->setValue(settings.value("overlayLimit").toInt(8));
        overlaySeconds->setValue(settings.value("overlaySeconds").toInt(25));
        sharingAutoStart->setChecked(settings.value("sharingAutoStart").toBool());
        const auto alerts = settings.value("alerts").toObject();
        alertsEnabled->setChecked(alerts.value("enabled").toBool(true));
        giftAlerts->setChecked(alerts.value("gifts").toBool(true));
        followAlerts->setChecked(alerts.value("follows").toBool(true));
        alertSeconds->setValue(alerts.value("seconds").toInt(5));
        alertVolume->setValue(alerts.value("volume").toInt(60));
        const int audioIndex = alertAudio->findData(alerts.value("audio").toString("stream"));
        alertAudio->setCurrentIndex(audioIndex < 0 ? 1 : audioIndex);
        configureAlertsSource(false);
        auto font = timeline->font();
        font.setPointSize(fontSize->value());
        timeline->setFont(font);
        if (kind == "snapshot") {
            activeCombos.clear();
            for (const auto value : message.value("combos").toArray()) {
                const auto combo = value.toObject();
                activeCombos.insert(combo.value("key").toString(), combo.value("event").toObject());
            }
            updateComboNotice();
            timeline->clear();
            for (const auto value : message.value("events").toArray()) {
                addEvent(value.toObject());
            }
        }
    } else if (kind == "event") {
        addEvent(message.value("event").toObject());
    } else if (kind == "combo") {
        const auto key = message.value("key").toString();
        if (message.value("complete").toBool()) {
            activeCombos.remove(key);
        } else {
            activeCombos.remove(key);
            activeCombos.insert(key, message.value("event").toObject());
            while (activeCombos.size() > 8) {
                activeCombos.erase(activeCombos.begin());
            }
        }
        updateComboNotice();
    } else if (kind == "sharing") {
        sharingConsented = message.value("consented").toBool();
        if (!sharingConsented) {
            sharingAutoStart->setChecked(false);
        }
        sharingStatus->setText(message.value("detail").toString());
        sharingUrl->setText(message.value("link").toString());
        sharingStart->setText(sharingConsented ? "Start sharing · same link" : "Enable sharing / generate link");
        sharingAutoStart->setEnabled(bridgeConnected && sharingConsented);
        const auto sharingState = message.value("status").toString();
        sharingStop->setEnabled(bridgeConnected && sharingState != "off" && sharingState != "error");
        sharingReset->setEnabled(bridgeConnected && sharingConsented);
        const auto qr = message.value("qr").toString();
        QPixmap pixmap;
        if (qr.startsWith("data:image/png;base64,") && qr.size() < 128 * 1024
            && pixmap.loadFromData(QByteArray::fromBase64(qr.mid(22).toLatin1()), "PNG")) {
            sharingQr->setPixmap(pixmap.scaled(220, 220, Qt::KeepAspectRatio, Qt::FastTransformation));
            sharingQr->show();
        } else {
            sharingQr->hide();
        }
    } else if (kind == "sounds") {
        const auto names = message.value("names").toObject();
        giftSound->setText(names.value("gift").toString().isEmpty() ? "Default · Sparkle" : names.value("gift").toString());
        followSound->setText(names.value("follow").toString().isEmpty() ? "Default · Welcome" : names.value("follow").toString());
    } else if (kind == "profile") {
        const auto profile = message.value("user").toObject();
        for (int row = 0; row < timeline->count(); ++row) {
            auto *item = timeline->item(row);
            auto event = item->data(Qt::UserRole + 2).toJsonObject();
            auto user = event.value("user").toObject();
            if (event.value("platform") != message.value("platform")
                || user.value("id") != message.value("id")) {
                continue;
            }
            const auto previous = user.value("displayName").toString() + " " + user.value("username").toString();
            for (auto field = profile.begin(); field != profile.end(); ++field) {
                user.insert(field.key(), field.value());
            }
            event.insert("user", user);
            item->setData(Qt::UserRole + 2, event);
            item->setText(item->text().replace(previous,
                user.value("displayName").toString() + " " + user.value("username").toString()));
        }
        timeline->doItemsLayout();
        filter();
    } else if (kind == "clear") {
        activeCombos.clear();
        updateComboNotice();
        timeline->clear();
        filter();
    } else if (kind == "state") {
        const auto youtube = message.value("youtube").toObject();
        const auto tiktok = message.value("tiktok").toObject();
        youtubeLabel->setText(QString("%1\n%2\n%3")
            .arg(youtube.value("account").toString(), youtube.value("detail").toString(), youtube.value("title").toString()).trimmed());
        tiktokLabel->setText(QString("%1\n%2")
            .arg(tiktok.value("account").toString(), tiktok.value("detail").toString()));
        const auto updateStatus = [](QLabel *label, const QString &name, const QJsonObject &state) {
            const auto status = state.value("status").toString();
            const auto color = status == "connected" ? "#64d7b0"
                : status == "connecting" ? "#f5cb79" : status == "error" ? "#ff828e" : "#929db3";
            const auto tag = status == "connected" ? "LIVE"
                : status == "connecting" ? "…" : status == "error" ? "ERROR" : "OFF";
            const auto count = state.value("viewers");
            const auto viewers = status == "connected" && count.isDouble()
                ? QString::number(static_cast<qint64>(count.toDouble())) : QString("—");
            label->setText(QString("● %1 · %2\n%3 viewers").arg(name, tag, viewers));
            label->setToolTip(QString("%1 · %2\nViewers: %3\n%4")
                .arg(name, status, viewers, state.value("detail").toString()));
            label->setStyleSheet(QString("color: %1; font-size: 10px;").arg(color));
        };
        updateStatus(youtubeStatus, "YouTube", youtube);
        updateStatus(tiktokStatus, "TikTok", tiktok);
        canReply = youtube.value("canReply").toBool();
        reply->setEnabled(canReply);
        reply->setVisible(canReply);
        sendButton->setVisible(canReply);
        sendButton->setEnabled(bridgeConnected && canReply && pendingReply.isEmpty());
        const auto selected = settings.value("youtubeBroadcastId").toString();
        QSignalBlocker blocker(broadcasts);
        broadcasts->clear();
        broadcasts->addItem("Automatic active / latest broadcast", "");
        for (const auto value : message.value("broadcasts").toArray()) {
            const auto broadcast = value.toObject();
            broadcasts->addItem(broadcast.value("title").toString(), broadcast.value("id").toString());
        }
        const int index = broadcasts->findData(selected);
        broadcasts->setCurrentIndex(index < 0 ? 0 : index);
        if (message.contains("overlayUrl")) {
            overlayUrl->setText(message.value("overlayUrl").toString());
        }
        if (message.contains("viewerUrl")) {
            viewerUrl->setText(message.value("viewerUrl").toString());
        }
        if (message.contains("alertsUrl")) {
            alertsUrl->setText(message.value("alertsUrl").toString());
            configureAlertsSource(false);
        }
    } else if (kind == "result") {
        const bool success = message.value("ok").toBool();
        statusLabel->setText(success ? "Operation completed" : message.value("error").toString());
        if (message.value("requestId").toString() == pendingReply) {
            sendTimeout.stop();
            pendingReply.clear();
            sendButton->setText("Send");
            sendButton->setEnabled(bridgeConnected && canReply);
            if (success) {
                reply->clear();
            }
        }
        const QUrl url(message.value("url").toString());
        if (success && url.scheme() == "https" && url.host() == "accounts.google.com") {
            QDesktopServices::openUrl(url);
        }
    }
}

void ChatDock::addEvent(const QJsonObject &event)
{
    const auto user = event.value("user").toObject();
    const auto platformName = event.value("platform").toString();
    const auto type = event.value("type").toString();
    const auto timestamp = static_cast<qint64>(event.value("timestamp").toDouble());
    QStringList badges;
    for (const auto badge : user.value("badges").toArray()) {
        badges.append(badge.toString());
    }
    auto text = QString("%1  [%2] %3 %4\n%5")
        .arg(QDateTime::fromMSecsSinceEpoch(timestamp).toString("HH:mm:ss"), platformName,
            user.value("displayName").toString() + " " + user.value("username").toString(),
            badges.join(" · "), event.value("message").toString());
    const auto monetary = event.value("monetaryEvent").toObject();
    if (!monetary.isEmpty()) {
        text += QString("\n%1 %2  %3 ×%4")
            .arg(monetary.value("amount").toVariant().toString(), monetary.value("currency").toString(),
                monetary.value("giftName").toString(), monetary.value("quantity").toVariant().toString());
    }
    auto *item = new QListWidgetItem(text);
    item->setData(Qt::UserRole, platformName);
    item->setData(Qt::UserRole + 1, timestamp);
    item->setData(Qt::UserRole + 2, event);
    if (type == "gift" || type == "superchat") {
        item->setBackground(QColor("#363026"));
        item->setForeground(QColor("#ffe1a0"));
    }
    int row = timeline->count();
    while (row > 0 && timeline->item(row - 1)->data(Qt::UserRole + 1).toLongLong() > timestamp) {
        --row;
    }
    timeline->insertItem(row, item);
    while (timeline->count() > messageLimit->value()) {
        delete timeline->takeItem(0);
    }
    filter();
    if (autoScroll->isChecked()) {
        timeline->scrollToBottom();
    }
}

void ChatDock::filter()
{
    const auto selected = platform->currentText().toLower();
    int visible = 0;
    for (int index = 0; index < timeline->count(); ++index) {
        auto *item = timeline->item(index);
        item->setHidden((selected != "all" && item->data(Qt::UserRole).toString() != selected)
            || !item->text().contains(search->text(), Qt::CaseInsensitive));
        if (!item->isHidden()) {
            ++visible;
        }
    }
    messageCount->setText(QString("%1 messages").arg(visible));
    emptyState->setVisible(visible == 0);
    emptyState->setText(timeline->count() == 0
        ? "Your chat, in one place\n\nConnect YouTube or TikTok in Accounts.\nNew messages will appear here."
        : "No matching messages\n\nTry another filter or search.");
    updateComboNotice();
}

void ChatDock::updateComboNotice()
{
    if (activeCombos.isEmpty() || platform->currentText() == "YouTube") {
        comboNotice->hide();
        return;
    }
    QStringList lines;
    int count = 0;
    for (const auto &event : activeCombos) {
        const auto user = event.value("user").toObject();
        const auto gift = event.value("monetaryEvent").toObject();
        const auto name = comboNotice->fontMetrics().elidedText(user.value("displayName").toString(), Qt::ElideRight, 130);
        const auto giftName = comboNotice->fontMetrics().elidedText(gift.value("giftName").toString("Gift"), Qt::ElideRight, 100);
        lines.append(QString("%1 · %2 ×%3\nกำลังคอมโบ · Combo in progress")
            .arg(name, giftName, gift.value("quantity").toVariant().toString()));
        if (++count >= 3) {
            break;
        }
    }
    comboNotice->setFixedWidth(qMin(260, qMax(80, timeline->viewport()->width() - 16)));
    comboNotice->setText(lines.join("\n"));
    comboNotice->adjustSize();
    comboNotice->move(qMax(8, timeline->viewport()->width() - comboNotice->width() - 8),
        qMax(8, timeline->viewport()->height() - comboNotice->height() - 8));
    comboNotice->show();
    comboNotice->raise();
}

bool ChatDock::eventFilter(QObject *object, QEvent *event)
{
    if (object == timeline->viewport() && event->type() == QEvent::Resize) {
        updateComboNotice();
    }
    return QWidget::eventFilter(object, event);
}

void ChatDock::shutdown()
{
    bridge.stop();
}
