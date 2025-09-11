#include <napi.h>
#include "libraw_wrapper.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return LibRawWrapper::Init(env, exports);
}

NODE_API_MODULE(libraw_addon, InitAll)
