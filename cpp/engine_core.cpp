#include "engine_core.h"

Napi::FunctionReference EngineCore::constructor;

Napi::Object EngineCore::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "EngineCore", {
        InstanceMethod("addBlockPattern", &EngineCore::AddBlockPattern),
        InstanceMethod("checkUrl", &EngineCore::CheckUrl),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("EngineCore", func);
    return exports;
}

EngineCore::EngineCore(const Napi::CallbackInfo& info) : Napi::ObjectWrap<EngineCore>(info) {
    Napi::Env env = info.Env();
    // Initialize things if needed
}

Napi::Value EngineCore::AddBlockPattern(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string pattern = info[0].As<Napi::String>().Utf8Value();
    this->urlFilter.AddPattern(pattern);

    return env.Null();
}

Napi::Value EngineCore::CheckUrl(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string url = info[0].As<Napi::String>().Utf8Value();
    bool blocked = this->urlFilter.ShouldBlock(url);

    Napi::Object result = Napi::Object::New(env);
    result.Set("blocked", Napi::Boolean::New(env, blocked));
    
    if (blocked) {
        result.Set("reason", "Filtered by C++ Engine");
    }

    return result;
}
