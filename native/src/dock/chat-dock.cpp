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

ChatDock::ChatDock(QWidget *parent) : QWidget(parent), bridge(this)
{
    setMinimumSize(280, 320);
    setStyleSheet(
        "QWidget { background: #17191f; color: #e6e8ef; font-family: 'Segoe UI', 'Tahoma'; }"
        "QLineEdit, QComboBox, QSpinBox, QListWidget { background: #22252e; border: 1px solid #383d49; border-radius: 5px; padding: 5px; }"
        "QPushButton { background: #303747; border: 1px solid #465168; border-radius: 5px; padding: 6px; }"
        "QPushButton:hover { background: #404d66; }"
        "QPushButton:disabled { color: #777d8b; }"
        "QListWidget::item { padding: 6px; border-bottom: 1px solid #30343f; }"
    );
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(8, 8, 8, 8);
    statusLabel = new QLabel("Starting local bridge");
    statusLabel->setWordWrap(true);
    layout->addWidget(statusLabel);
    auto *tabs = new QTabWidget;
    layout->addWidget(tabs);

    auto *accounts = new QWidget;
    auto *accountLayout = new QVBoxLayout(accounts);
    youtubeLabel = new QLabel("YouTube: login required");
    youtubeLabel->setWordWrap(true);
    accountLayout->addWidget(youtubeLabel);
    auto *login = new QPushButton("Login with YouTube");
    auto *logout = new QPushButton("Logout YouTube");
    accountLayout->addWidget(login);
    accountLayout->addWidget(logout);
    broadcasts = new QComboBox;
    accountLayout->addWidget(broadcasts);
    youtubeLiveUrl = new QLineEdit;
    youtubeLiveUrl->setMaxLength(2048);
    youtubeLiveUrl->setPlaceholderText("YouTube LIVE ID or URL (read-only)");
    accountLayout->addWidget(youtubeLiveUrl);
    auto *readOnlyHint = new QLabel("Enter a LIVE ID/URL to read chat without login using an API key. Clear to use account broadcasts.");
    readOnlyHint->setWordWrap(true);
    accountLayout->addWidget(readOnlyHint);
    tiktokLabel = new QLabel("TikTok: unofficial username connection");
    tiktokLabel->setWordWrap(true);
    accountLayout->addWidget(tiktokLabel);
    username = new QLineEdit;
    username->setPlaceholderText("TikTok username, without @");
    accountLayout->addWidget(username);
    tiktokEnabled = new QCheckBox("Enable unofficial TikTok connector");
    accountLayout->addWidget(tiktokEnabled);
    autoDetect = new QCheckBox("Automatically detect YouTube LIVE");
    autoDetect->setChecked(true);
    accountLayout->addWidget(autoDetect);
    auto *applyAccounts = new QPushButton("Save accounts and connect");
    auto *refresh = new QPushButton("Refresh LIVE sessions");
    accountLayout->addWidget(applyAccounts);
    accountLayout->addWidget(refresh);
    accountLayout->addStretch();
    tabs->addTab(accounts, "Accounts");

    auto *chat = new QWidget;
    auto *chatLayout = new QVBoxLayout(chat);
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
    chatLayout->addWidget(timeline, 1);
    auto *tools = new QHBoxLayout;
    autoScroll = new QCheckBox("Auto-scroll");
    autoScroll->setChecked(true);
    auto *clear = new QPushButton("Clear");
    tools->addWidget(autoScroll);
    tools->addStretch();
    tools->addWidget(clear);
    chatLayout->addLayout(tools);
    auto *replyLayout = new QHBoxLayout;
    reply = new QLineEdit;
    reply->setMaxLength(200);
    reply->setPlaceholderText("Reply to YouTube LIVE · Enter to send");
    sendButton = new QPushButton("Send");
    sendButton->setEnabled(false);
    replyLayout->addWidget(reply, 1);
    replyLayout->addWidget(sendButton);
    chatLayout->addLayout(replyLayout);
    tabs->addTab(chat, "Chat");

    QSettings local("OBSUnifiedChat", "NativeDock");
    auto *settingsWidget = new QWidget;
    auto *form = new QFormLayout(settingsWidget);
    rootPath = new QLineEdit(local.value("bridgeRoot").toString());
    nodePath = new QLineEdit(local.value("nodePath", "C:/Program Files/nodejs/node.exe").toString());
    clientId = new QLineEdit(local.value("youtubeClientId").toString());
    clientSecret = new QLineEdit(local.value("youtubeClientSecret").toString());
    clientSecret->setEchoMode(QLineEdit::Password);
    apiKey = new QLineEdit(local.value("youtubeApiKey").toString());
    apiKey->setEchoMode(QLineEdit::Password);
    form->addRow("Package folder", rootPath);
    form->addRow("Node executable", nodePath);
    form->addRow("Google desktop client ID", clientId);
    form->addRow("Desktop client secret", clientSecret);
    form->addRow("YouTube API Key (read-only LIVE)", apiKey);
    startWithObs = new QCheckBox("Start bridge with OBS");
    startWithObs->setChecked(local.value("startWithObs", true).toBool());
    autoReconnect = new QCheckBox("Reconnect platform sessions");
    autoReconnect->setChecked(true);
    form->addRow(startWithObs);
    form->addRow(autoReconnect);
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
    form->addRow("Message limit", messageLimit);
    form->addRow("Font size", fontSize);
    form->addRow("Overlay messages", overlayLimit);
    form->addRow("Overlay lifetime (seconds)", overlaySeconds);
    overlayUrl = new QLineEdit;
    overlayUrl->setReadOnly(true);
    form->addRow("Browser Source URL", overlayUrl);
    auto *copy = new QPushButton("Copy overlay URL");
    form->addRow(copy);
    auto *save = new QPushButton("Save settings");
    auto *start = new QPushButton("Start bridge");
    form->addRow(save);
    form->addRow(start);
    auto *scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setWidget(settingsWidget);
    tabs->addTab(scroll, "Settings");

    connect(&bridge, &BridgeClient::status, statusLabel, &QLabel::setText);
    connect(&bridge, &BridgeClient::received, this, &ChatDock::receive);
    connect(&bridge, &BridgeClient::connected, this, [this](bool connected) {
        bridgeConnected = connected;
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
    settings.insert("tiktokUsername", username->text().trimmed());
    settings.insert("tiktokEnabled", tiktokEnabled->isChecked());
    settings.insert("autoDetect", autoDetect->isChecked());
    settings.insert("autoReconnect", autoReconnect->isChecked());
    settings.insert("messageLimit", messageLimit->value());
    settings.insert("fontSize", fontSize->value());
    settings.insert("overlayLimit", overlayLimit->value());
    settings.insert("overlaySeconds", overlaySeconds->value());
    settings.insert("youtubeBroadcastId", broadcasts->currentData().toString());
    settings.insert("youtubeLiveUrl", youtubeLiveUrl->text().trimmed());
    bridge.command("settings", {{"settings", settings}});
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
        auto font = timeline->font();
        font.setPointSize(fontSize->value());
        timeline->setFont(font);
        if (kind == "snapshot") {
            timeline->clear();
            for (const auto value : message.value("events").toArray()) {
                addEvent(value.toObject());
            }
        }
    } else if (kind == "event") {
        addEvent(message.value("event").toObject());
    } else if (kind == "clear") {
        timeline->clear();
    } else if (kind == "state") {
        const auto youtube = message.value("youtube").toObject();
        const auto tiktok = message.value("tiktok").toObject();
        youtubeLabel->setText(QString("YouTube · %1\n%2\n%3")
            .arg(youtube.value("account").toString(), youtube.value("detail").toString(), youtube.value("title").toString()));
        tiktokLabel->setText(QString("TikTok · %1\n%2")
            .arg(tiktok.value("account").toString(), tiktok.value("detail").toString()));
        canReply = youtube.value("canReply").toBool();
        reply->setEnabled(canReply);
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
            user.value("displayName").toString(), badges.join(" · "), event.value("message").toString());
    const auto monetary = event.value("monetaryEvent").toObject();
    if (!monetary.isEmpty()) {
        text += QString("\n%1 %2  %3 ×%4")
            .arg(monetary.value("amount").toVariant().toString(), monetary.value("currency").toString(),
                monetary.value("giftName").toString(), monetary.value("quantity").toVariant().toString());
    }
    auto *item = new QListWidgetItem(text);
    item->setData(Qt::UserRole, platformName);
    item->setData(Qt::UserRole + 1, timestamp);
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
    for (int index = 0; index < timeline->count(); ++index) {
        auto *item = timeline->item(index);
        item->setHidden((selected != "all" && item->data(Qt::UserRole).toString() != selected)
            || !item->text().contains(search->text(), Qt::CaseInsensitive));
    }
}

void ChatDock::shutdown()
{
    bridge.stop();
}
