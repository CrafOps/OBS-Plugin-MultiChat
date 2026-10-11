#pragma once

#include <QWidget>
#include <QJsonObject>
#include <QListWidget>
#include <QLineEdit>
#include <QLabel>
#include <QComboBox>
#include <QCheckBox>
#include <QPushButton>
#include <QSpinBox>
#include <QTimer>
#include "../bridge/bridge-client.hpp"

class ChatDock final : public QWidget {
    Q_OBJECT

public:
    explicit ChatDock(QWidget *parent = nullptr);
    void shutdown();

private:
    void receive(const QJsonObject &message);
    void addEvent(const QJsonObject &event);
    void filter();
    void saveSettings();
    void sendReply();
    BridgeClient bridge;
    QJsonObject settings;
    QListWidget *timeline;
    QLabel *statusLabel;
    QLabel *youtubeLabel;
    QLabel *tiktokLabel;
    QLineEdit *username;
    QLineEdit *search;
    QLineEdit *reply;
    QLineEdit *rootPath;
    QLineEdit *nodePath;
    QLineEdit *clientId;
    QLineEdit *clientSecret;
    QLineEdit *apiKey;
    QLineEdit *youtubeLiveUrl;
    QLineEdit *overlayUrl;
    QComboBox *platform;
    QComboBox *broadcasts;
    QCheckBox *autoScroll;
    QCheckBox *autoDetect;
    QCheckBox *autoReconnect;
    QCheckBox *tiktokEnabled;
    QCheckBox *startWithObs;
    QSpinBox *messageLimit;
    QSpinBox *fontSize;
    QSpinBox *overlayLimit;
    QSpinBox *overlaySeconds;
    QPushButton *sendButton;
    QTimer sendTimeout;
    QString pendingReply;
    bool canReply = false;
    bool bridgeConnected = false;
};
