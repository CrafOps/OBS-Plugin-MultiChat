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
#include <QPlainTextEdit>
#include <QTimer>
#include <QMap>
#include "../bridge/bridge-client.hpp"
class QVBoxLayout;

class ChatDock final : public QWidget {
    Q_OBJECT

public:
    explicit ChatDock(QWidget *parent = nullptr);
    void shutdown();
    void refreshAlertsSource();

private:
    void receive(const QJsonObject &message);
    void addEvent(const QJsonObject &event);
    void filter();
    void saveSettings();
    void sendReply();
    void createAlertControls(QVBoxLayout *layout);
    void createSharingControls(QVBoxLayout *layout);
    bool configureAlertsSource(bool create, bool applyAudio = false);
    void updateComboNotice();
    bool eventFilter(QObject *object, QEvent *event) override;
    BridgeClient bridge;
    QJsonObject settings;
    QListWidget *timeline;
    QLabel *statusLabel;
    QLabel *youtubeLabel;
    QLabel *tiktokLabel;
    QLabel *youtubeStatus;
    QLabel *tiktokStatus;
    QLabel *emptyState;
    QLabel *messageCount;
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
    QLineEdit *viewerUrl;
    QLineEdit *alertsUrl;
    QLineEdit *sharingUrl;
    QCheckBox *alertsEnabled;
    QCheckBox *giftAlerts;
    QCheckBox *followAlerts;
    QCheckBox *sharingAutoStart;
    QComboBox *alertAudio;
    QSpinBox *alertVolume;
    QSpinBox *alertSeconds;
    QLabel *giftSound;
    QLabel *followSound;
    QLabel *sharingStatus;
    QLabel *sharingQr;
    QLabel *comboNotice;
    QPushButton *sharingStart;
    QPushButton *sharingStop;
    QPushButton *sharingReset;
    QMap<QString, QJsonObject> activeCombos;
    bool sharingConsented = false;
    QComboBox *platform;
    QComboBox *broadcasts;
    QCheckBox *autoScroll;
    QCheckBox *autoDetect;
    QCheckBox *autoReconnect;
    QCheckBox *tiktokEnabled;
    QCheckBox *startWithObs;
    QCheckBox *autoUpdate;
    QLabel *updateLabel;
    QSpinBox *messageLimit;
    QSpinBox *fontSize;
    QSpinBox *overlayLimit;
    QSpinBox *overlaySeconds;
    QPlainTextEdit *overlayCustomCss;
    QPushButton *sendButton;
    QTimer sendTimeout;
    QString pendingReply;
    bool canReply = false;
    bool bridgeConnected = false;
};
