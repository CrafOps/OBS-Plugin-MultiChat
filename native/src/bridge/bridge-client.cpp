#include "bridge-client.hpp"
#include <QCoreApplication>
#include <QJsonDocument>
#include <QNetworkRequest>
#include <QRandomGenerator>
#include <QUuid>
#include <QDir>
#include <QStandardPaths>
#include <QProcessEnvironment>
#include <QFileInfo>
#include <windows.h>

BridgeClient::BridgeClient(QObject *parent) : QObject(parent)
{
    processJob = CreateJobObjectW(nullptr, nullptr);
    if (processJob) {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION information{};
        information.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if (!SetInformationJobObject(processJob, JobObjectExtendedLimitInformation,
                &information, sizeof(information))) {
            CloseHandle(processJob);
            processJob = nullptr;
        }
    }
    connect(&process, &QProcess::started, this, [this] {
        const auto handle = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, FALSE,
            static_cast<DWORD>(process.processId()));
        const bool assigned = handle && processJob && AssignProcessToJobObject(processJob, handle);
        if (handle) {
            CloseHandle(handle);
        }
        if (!assigned) {
            emit status("Cannot establish bridge process ownership; startup cancelled");
            stopping = true;
            process.kill();
        }
    });
    reconnect.setSingleShot(true);
    startup.setSingleShot(true);
    connect(&reconnect, &QTimer::timeout, this, [this] {
        if (process.state() == QProcess::NotRunning) {
            start();
        } else {
            connectSocket();
        }
    });
    connect(&startup, &QTimer::timeout, this, [this] {
        emit status("Bridge startup timed out; check runtime path and port 17865");
        process.kill();
    });
    connect(&process, &QProcess::readyReadStandardOutput, this, [this] {
        output += process.readAllStandardOutput();
        if (output.contains("READY\n")) {
            output.clear();
            startup.stop();
            connectSocket();
        }
        if (output.size() > 4096) {
            output.clear();
        }
    });
    connect(&process, &QProcess::readyReadStandardError, this, [this] {
        process.readAllStandardError();
        emit status("Bridge reported an error; check configuration and installed dependencies");
    });
    connect(&process, &QProcess::errorOccurred, this, [this](QProcess::ProcessError) {
        startup.stop();
        emit status("Unable to launch Node bridge; configure its runtime and entry point");
    });
    connect(&process, qOverload<int, QProcess::ExitStatus>(&QProcess::finished), this,
        [this](int, QProcess::ExitStatus) {
            startup.stop();
            socket.abort();
            emit connected(false);
            if (!stopping && failures < 8) {
                emit status("Bridge exited; retrying");
                reconnect.start(qMin(60000, 1000 * (1 << failures++)));
            }
        });
    connect(&socket, &QWebSocket::connected, this, [this] {
        failures = 0;
        emit connected(true);
        emit status("Local bridge connected");
    });
    connect(&socket, &QWebSocket::disconnected, this, [this] {
        emit connected(false);
        if (!stopping) {
            reconnect.start(2000);
        }
    });
    connect(&socket, &QWebSocket::textMessageReceived, this, [this](const QString &text) {
        QJsonParseError error;
        const auto document = QJsonDocument::fromJson(text.toUtf8(), &error);
        if (error.error == QJsonParseError::NoError && document.isObject()) {
            emit received(document.object());
        }
    });
}

BridgeClient::~BridgeClient()
{
    stop();
    if (processJob) {
        CloseHandle(processJob);
    }
}

void BridgeClient::start()
{
    if (process.state() != QProcess::NotRunning) {
        return;
    }
    stopping = false;
    output.clear();
    QSettings settings("OBSUnifiedChat", "NativeDock");
    const auto root = settings.value("bridgeRoot").toString();
    const auto node = settings.value("nodePath", "C:/Program Files/nodejs/node.exe").toString();
    const auto script = QDir(root).filePath("bridge/dist/main.js");
    if (root.isEmpty() || !QFileInfo::exists(node) || !QFileInfo::exists(script)) {
        emit status("Set the package folder and Node executable in Settings, then Start bridge");
        return;
    }
    token.clear();
    for (int index = 0; index < 8; ++index) {
        token += QByteArray::number(QRandomGenerator::system()->generate(), 16).rightJustified(8, '0');
    }
    auto environment = QProcessEnvironment::systemEnvironment();
    environment.insert("BRIDGE_TOKEN", QString::fromLatin1(token));
    environment.insert("BRIDGE_PORT", QString::number(port));
    environment.insert("BRIDGE_PARENT_PID", QString::number(QCoreApplication::applicationPid()));
    environment.insert("YOUTUBE_CLIENT_ID", settings.value("youtubeClientId").toString());
    environment.insert("YOUTUBE_CLIENT_SECRET", settings.value("youtubeClientSecret").toString());
    process.setProcessEnvironment(environment);
    process.setWorkingDirectory(root);
    process.setProgram(node);
    process.setArguments({script});
    process.setCreateProcessArgumentsModifier([](QProcess::CreateProcessArguments *arguments) {
        arguments->flags |= CREATE_NO_WINDOW;
    });
    process.start();
    startup.start(15000);
}

void BridgeClient::connectSocket()
{
    if (stopping || socket.state() == QAbstractSocket::ConnectedState) {
        return;
    }
    QNetworkRequest request(QUrl(QString("ws://127.0.0.1:%1/control").arg(port)));
    request.setRawHeader("Authorization", "Bearer " + token);
    socket.open(request);
}

QString BridgeClient::command(const QString &kind, const QJsonObject &values)
{
    if (socket.state() != QAbstractSocket::ConnectedState) {
        emit status("Bridge is disconnected");
        return {};
    }
    auto object = values;
    const auto id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    object.insert("kind", kind);
    object.insert("requestId", id);
    socket.sendTextMessage(QString::fromUtf8(QJsonDocument(object).toJson(QJsonDocument::Compact)));
    return id;
}

void BridgeClient::stop()
{
    stopping = true;
    reconnect.stop();
    startup.stop();
    socket.close();
    if (process.state() != QProcess::NotRunning) {
        process.write("shutdown\n");
        process.closeWriteChannel();
        // Only plugin teardown waits; ordinary operations remain asynchronous.
        if (!process.waitForFinished(2000)) {
            process.kill();
            process.waitForFinished(1000);
        }
    }
    token.fill('\0');
    token.clear();
}
