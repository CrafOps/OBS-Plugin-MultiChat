#include <obs-module.h>
#include <obs-frontend-api.h>
#include <QCoreApplication>
#include <QPointer>
#include "dock/chat-dock.hpp"

OBS_DECLARE_MODULE()
OBS_MODULE_USE_DEFAULT_LOCALE("obs-unified-chat", "en-US")
MODULE_EXPORT const char *obs_module_description(void)
{
    return "Multi Live Chat by @CrafOps — YouTube and TikTok LIVE chat";
}

static QPointer<ChatDock> dock;
static constexpr const char *dockId = "obs-unified-live-chat";

static void frontendEvent(enum obs_frontend_event event, void *)
{
    if (event == OBS_FRONTEND_EVENT_FINISHED_LOADING && !dock) {
        auto *widget = new ChatDock;
        if (obs_frontend_add_dock_by_id(dockId, "Multi Live Chat by @CrafOps", widget)) {
            dock = widget;
        } else {
            delete widget;
            blog(LOG_ERROR, "[unified-chat] Dock registration failed");
        }
    }
    if (event == OBS_FRONTEND_EVENT_EXIT && dock) {
        dock->shutdown();
    }
}

bool obs_module_load(void)
{
    obs_frontend_add_event_callback(frontendEvent, nullptr);
    blog(LOG_INFO, "[unified-chat] Loaded native plugin; requires OBS 30+ and matching Qt 6 ABI");
    return true;
}

void obs_module_unload(void)
{
    obs_frontend_remove_event_callback(frontendEvent, nullptr);
    if (dock) {
        dock->shutdown();
        obs_frontend_remove_dock(dockId);
        // Some frontend implementations defer deleting the container. Destroy our
        // widget while this module's code is still loaded, if OBS has not done so.
        if (dock) {
            delete dock.data();
        }
        dock = nullptr;
    }
}
