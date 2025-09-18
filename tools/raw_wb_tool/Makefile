CXX ?= c++
CXXFLAGS ?= -O2 -std=gnu++17 -Wall -Wextra -Wno-unused-parameter

OPENCV_PKG ?= opencv4
OPENCV_FLAGS := $(shell pkg-config --cflags $(OPENCV_PKG) 2>/dev/null)
OPENCV_LIBS := $(shell pkg-config --libs $(OPENCV_PKG) 2>/dev/null)
ifeq ($(OPENCV_FLAGS),)
	OPENCV_PKG := opencv
	OPENCV_FLAGS := $(shell pkg-config --cflags $(OPENCV_PKG) 2>/dev/null)
	OPENCV_LIBS := $(shell pkg-config --libs $(OPENCV_PKG) 2>/dev/null)
endif

LIBRAW_FLAGS := $(shell pkg-config --cflags --libs libraw 2>/dev/null)
LCMS2_FLAGS := $(shell pkg-config --cflags --libs lcms2 2>/dev/null)

SRC := raw_wb_tool.cpp
BIN := raw_wb_tool
BUILD_DIR := ../../build/tools
OUT := $(BUILD_DIR)/$(BIN)

.PHONY: all clean run sample

all: $(OUT)

$(OUT): $(SRC)
	@mkdir -p $(BUILD_DIR)
ifeq ($(strip $(OPENCV_FLAGS)),)
	@echo "[error] pkg-config did not find OpenCV (tried opencv4/opencv). Please install OpenCV or set PKG_CONFIG_PATH." && exit 2
endif
ifeq ($(strip $(LIBRAW_FLAGS)),)
	@echo "[error] pkg-config did not find libraw. Please install libraw or set PKG_CONFIG_PATH." && exit 2
endif
ifeq ($(strip $(LCMS2_FLAGS)),)
	@echo "[error] pkg-config did not find lcms2 (littleCMS). Please install lcms2 or set PKG_CONFIG_PATH." && exit 2
endif
	$(CXX) $(CXXFLAGS) $(SRC) -I.. -I. -I../.. $(OPENCV_FLAGS) $(LIBRAW_FLAGS) $(LCMS2_FLAGS) -o $(OUT) $(OPENCV_LIBS)
	@echo "Built $(OUT)"

clean:
	rm -f $(OUT)

run: $(OUT)
	$(OUT) $(FILE)

sample: $(OUT)
	$(OUT) /Users/fuguoqiang/Documents/workspace/infra/librawspeed/raw-samples-repo/ARW/DSC02975.ARW --out /Users/fuguoqiang/Documents/workspace/infra/librawspeed/tools/raw_wb_tool/output.jpg --wb camera --quality 92 --notes


