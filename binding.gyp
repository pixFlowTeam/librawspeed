{
  "targets": [
    {
      "target_name": "libraw_addon",
      "sources": [
        "src/addon.cpp",
        "src/libraw_wrapper.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "deps/LibRaw-Source/LibRaw-0.21.4/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/libraw",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/win32/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64/include",
        "<!(node -e \"const p=require('path');const plat=process.platform;const arch=process.arch;const m=(plat==='win32'?'windows':plat);const a=(arch==='arm64'?'arm64':'x64');process.stdout.write(p.resolve('deps/lcms2/build/'+m+'-'+a+'/include'));\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "LIBRAW_NO_MEMPOOL_CHECK",
        "USE_LCMS2"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/win32/lib/libraw.a",
            "<!(node -e \"process.stdout.write(require('path').resolve('vendor/lcms2/lib/lcms2.lib'))\")"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2
            }
          },
          "copies": [
            {
              "destination": "<(module_root_dir)/build/Release/",
              "files": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/bin/libraw.dll"
              ]
            }
          ]
        }],
        ["OS=='mac'", {
          "conditions": [
            ["target_arch=='arm64'", {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64/lib/libraw.a",
                "<!(node -e \"const p=require('path');process.stdout.write(p.resolve('deps/lcms2/build/darwin-arm64/lib/liblcms2.a'))\")"
              ]
            }, {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64/lib/libraw.a",
                "<!(node -e \"const p=require('path');process.stdout.write(p.resolve('deps/lcms2/build/darwin-x64/lib/liblcms2.a'))\")"
              ]
            }]
          ]
        }],
        ["OS=='linux'", {
          "cflags": ["-fPIC"],
          "conditions": [
            ["target_arch=='arm64'", {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64/lib/libraw.a",
                "<!(node -e \"const p=require('path');process.stdout.write(p.resolve('deps/lcms2/build/linux-arm64/lib/liblcms2.a'))\")"
              ]
            }, {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64/lib/libraw.a",
                "<!(node -e \"const p=require('path');process.stdout.write(p.resolve('deps/lcms2/build/linux-x64/lib/liblcms2.a'))\")"
              ]
            }]
          ]
        }]
      ]
    }
  ]
}
