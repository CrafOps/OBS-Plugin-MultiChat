cmake_minimum_required(VERSION 3.24)
project(obs-unified-chat VERSION 0.1.0 LANGUAGES CXX)

if(NOT WIN32 OR NOT CMAKE_SIZEOF_VOID_P EQUAL 8)
  message(FATAL_ERROR "This plugin targets Windows x64")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
find_package(libobs CONFIG REQUIRED)
find_package(obs-frontend-api CONFIG REQUIRED)
find_package(Qt6 REQUIRED COMPONENTS Widgets Network WebSockets Concurrent)
if(DEFINED UNIFIED_CHAT_EXPECTED_QT AND NOT Qt6_VERSION VERSION_EQUAL UNIFIED_CHAT_EXPECTED_QT)
  message(FATAL_ERROR "Qt ${Qt6_VERSION} does not match target ${UNIFIED_CHAT_EXPECTED_QT}")
endif()

# Current source builds use the frontend-api alias; installed exports can use
# the full target name. Accept either official SDK representation.
if(TARGET OBS::frontend-api)
  set(UNIFIED_CHAT_FRONTEND_TARGET OBS::frontend-api)
elseif(TARGET OBS::obs-frontend-api)
  set(UNIFIED_CHAT_FRONTEND_TARGET OBS::obs-frontend-api)
else()
  message(FATAL_ERROR "OBS frontend SDK does not export a supported frontend target")
endif()

add_library(obs-unified-chat MODULE
  src/plugin-main.cpp
  src/dock/chat-dock.cpp
  src/dock/chat-dock.hpp
  src/dock/chat-delegate.cpp
  src/dock/chat-delegate.hpp
  src/dock/media-cache.cpp
  src/dock/media-cache.hpp
  src/bridge/bridge-client.cpp
  src/bridge/bridge-client.hpp
)
target_link_libraries(obs-unified-chat PRIVATE
  OBS::libobs ${UNIFIED_CHAT_FRONTEND_TARGET}
  Qt6::Widgets Qt6::Network Qt6::WebSockets Qt6::Concurrent
)
target_compile_definitions(obs-unified-chat PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)
target_compile_options(obs-unified-chat PRIVATE /W4 /permissive- /utf-8)
set_target_properties(obs-unified-chat PROPERTIES PREFIX "")
install(TARGETS obs-unified-chat LIBRARY DESTINATION obs-plugins/64bit
  RUNTIME DESTINATION obs-plugins/64bit)
install(DIRECTORY data/ DESTINATION data/obs-plugins/obs-unified-chat)

option(UNIFIED_CHAT_BUILD_UI_TESTS "Build native media and layout checks" OFF)
if(UNIFIED_CHAT_BUILD_UI_TESTS)
  enable_testing()
  add_executable(native-ui-check
    tests/ui-check.cpp
    src/dock/chat-delegate.cpp
    src/dock/media-cache.cpp
  )
  target_link_libraries(native-ui-check PRIVATE Qt6::Widgets Qt6::Network Qt6::Concurrent)
  target_compile_options(native-ui-check PRIVATE /W4 /permissive- /utf-8)
  add_test(NAME native-ui-check COMMAND native-ui-check)
  set_tests_properties(native-ui-check PROPERTIES TIMEOUT 30)
endif()
