#pragma once

#include <QObject>
#include <QProcess>
#include <QWebSocket>
#include <QTimer>
#include <QJsonObject>
#include <QSettings>

class BridgeClient final : public QObject {
    Q_OBJECT

public:
    explicit BridgeClient(QObject *parent = nullptr);
    ~BridgeClient() override;
    void start();
    void stop();
    QString command(const QString &kind, const QJsonObject &values = {});

signals:
    void received(const QJsonObject &message);
    void status(const QString &message);
    void connected(bool connected);

private:
    void connectSocket();
    QProcess process;
    QWebSocket socket;
    QTimer reconnect;
    QTimer startup;
    QByteArray token;
    QByteArray output;
    bool stopping = false;
    int failures = 0;
    quint16 port = 17865;
    void *processJob = nullptr;
};
