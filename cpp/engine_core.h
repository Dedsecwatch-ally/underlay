#pragma once

#include <napi.h>
#include "url_filter.h"

class EngineCore : public Napi::ObjectWrap<EngineCore> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    EngineCore(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;
    
    Napi::Value AddBlockPattern(const Napi::CallbackInfo& info);
    Napi::Value CheckUrl(const Napi::CallbackInfo& info);
    
    UrlFilter urlFilter;
};
