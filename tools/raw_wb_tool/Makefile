# Makefile for white point based white balance tool

CXX = g++
# vendor lcms2（按 OS-arch 目录）
UNAME_S := $(shell uname -s | tr '[:upper:]' '[:lower:]')
UNAME_M := $(shell uname -m)
LCMS_DIR = ../../deps/lcms2/build/$(UNAME_S)-$(UNAME_M)
LCMS_INC = $(LCMS_DIR)/include
LCMS_LIB = $(LCMS_DIR)/lib/liblcms2.a

# local LibRaw (avoid pkg-config dependency on system lcms2)
LIBRAW_ROOT = ../../deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64
LIBRAW_INC = $(LIBRAW_ROOT)/include
LIBRAW_LIB = $(LIBRAW_ROOT)/lib/libraw.a

CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -I../ -I$(LIBRAW_INC) -I$(LIBRAW_INC)/libraw -I$(LCMS_INC)
LDFLAGS = $(LIBRAW_LIB) `pkg-config --libs opencv4` $(LCMS_LIB)
OPENCV_FLAGS = `pkg-config --cflags opencv4`

# Directories
BUILD_DIR = build

# Targets
TARGET = $(BUILD_DIR)/raw_wb_whitepoint
INSPECT = $(BUILD_DIR)/inspect_whitepoint

# Object files
OBJS = $(BUILD_DIR)/color_temperature.o

# Build rules
all: $(BUILD_DIR) $(TARGET) $(INSPECT)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Color temperature library object
$(BUILD_DIR)/color_temperature.o: color_temperature.cpp color_temperature.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# Main target
$(TARGET): raw_wb_whitepoint.cpp $(OBJS) color_temperature.h
	$(CXX) $(CXXFLAGS) $(OPENCV_FLAGS) -o $@ raw_wb_whitepoint.cpp $(OBJS) $(LDFLAGS)

# Inspect-only tool (no OpenCV needed)
$(INSPECT): inspect_whitepoint.cpp $(OBJS) color_temperature.h
	$(CXX) $(CXXFLAGS) -o $@ inspect_whitepoint.cpp $(OBJS) $(LIBRAW_LIB) $(LCMS_LIB)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean