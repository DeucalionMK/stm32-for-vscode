/* eslint-disable max-len */
/**
* MIT License
*
* Copyright (c) 2020 Bureau Moeilijke Dingen
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

/*
 * Set of functions for creating a makefile based on STM32
 * makefile info and the Src, Inc and Lib folders
 * Created by Jort Band - Bureau Moeilijke Dingen
*/

import 'process';

import { isEmpty, isString, uniq } from 'lodash';

import MakeInfo from './types/MakeInfo';
import { fsPathToPosix } from './Helpers';
import { STM32_ENVIRONMENT_FILE_NAME, makefileName } from './Definitions';


/**
 * @description formats an array of string into one string with line endings per array entry.
 * @param {string[]} arr
 */
export function createStringList(arr: string[], prefix?: string): string {
  let output = '';
  const sortedArray = uniq(arr).sort();
  sortedArray.map((entry: string, ind: number) => {
    if (prefix) {
      output += prefix;
    }
    output += `${entry}`;
    if (ind < sortedArray.length - 1) {
      output += ' \\';
    }
    output += '\n';
  });

  return output;
}

/**
 * @description formats an array of strings into one string with spaces between entries.
 * @param {string[]} arr
 */
export function createSingleLineStringList(arr: string[], prefix?: string): string {
  let output = '';
  const sortedArray = uniq(arr).sort();
  sortedArray.map((entry) => {
    if (prefix) {
      output += prefix;
    }
    output += `${entry} `;
  });
  return output;
}

export function createGCCPathOutput(makeInfo: MakeInfo): string {
  if (makeInfo.tools.armToolchainPath && isString(makeInfo.tools.armToolchainPath)) {
    if (makeInfo?.tools?.armToolchainPath && !isEmpty(makeInfo.tools.armToolchainPath) && makeInfo.tools.armToolchainPath !== '.') {
      return `GCC_PATH="${fsPathToPosix(makeInfo.tools.armToolchainPath)}`;
    }
  }
  return '';
}
/**
 * Gives a prefix to an input string and checks if it already exists. If the input is empty the prefix is not added.
 */
function createPrefixWhenNoneExists(input: string, prefix: string): string {
  if (!input || input.length === 0) {
    return '';
  }
  if (input.indexOf(prefix) >= 0) {
    return input;
  }
  return `${prefix}${input}`;
}

/**
 * Create a string with compatible makefile rules.
 * @param makeInfo makeInfo
 * @returns a string containing custom makefile rules which can be embedded in the makefile
 */
function customMakefileRules(makeInfo: MakeInfo): string {

  if (makeInfo.customMakefileRules) {
    // reduces the makefile rules and returns them
    return makeInfo.customMakefileRules.reduce(
      (previousString, currentValue) => {
        const { command, rule, dependsOn = '' } = currentValue;
        const newRule =
          `
#######################################
# ${command}
#######################################
${command}: ${dependsOn}
\t${rule}
			`;
        return `${previousString}\n\n${newRule}`;
      }, '');

  }
  // returns empty when no customMakefileRules are found
  return '';
}

export default function createMakefile(makeInfo: MakeInfo): string {
  // NOTE: check for the correct info needs to be given beforehand
  return `##########################################################################################################################
# File automatically-generated by STM32forVSCode
##########################################################################################################################

# ------------------------------------------------
# Makefile used by STM32 For VSCode
# WARNING: This file can be overwritten when project settings change
# This Makefile can be used for CI/CD purposes to use it please make sure
# you setup an environment file with the following name: ${STM32_ENVIRONMENT_FILE_NAME}.
# This file is sourced at the start of this Makefile and will be used to set
# compiler paths and other tooling paths.
# Do note that most variables can also be overwritten when invoking make
# e.g to change the optimization flags
# make -j 16 -f ${makefileName} DEBUG=0 OPTIMIZATION=-Os
#
# ChangeLog :
#\t2017-02-10 - Several enhancements + project update mode
#   2015-07-22 - first version
#   2023-06-16 - Added .stm32env file inclusion
#   2023-07-14 - Added file directory in the build folder
#							 - Added debug and release build options
#							 - Added multi platform support
#							 - Added help target
#							 - Added more documentation
# ------------------------------------------------

######################################
# Environment Variables
######################################
# Imports the environment file in which the compiler and other tooling is set
# for the build machine.
# This can also be used to overwrite some makefile variables
include ${STM32_ENVIRONMENT_FILE_NAME}

######################################
# Target 
######################################
# This is the name of the embedded target which will be build
# The final file name will also have debug or release appended to it.
TARGET ?= ${makeInfo.target}

#######################################
# Build directories
#######################################
# Build path can be overwritten when calling make or setting the environment variable
# in ${STM32_ENVIRONMENT_FILE_NAME}

BUILD_DIRECTORY ?= build


######################################
# Optimization
######################################
# Optimization is switched based upon the DEBUG variable. If set to 1
# it will be build in debug mode with the Og optimization flag (optimized for debugging).
# If set to 0 (false) then by default the variable is used in the configuration yaml
# This can also be overwritten using the environment variable or by overwriting it
# by calling make with the OPTIMIZATION variable e.g.: 
# make -f ${makefileName} -j 16  OPTIMIZATION=Os

# variable which determines if it is a debug build
DEBUG ?= 1

# debug flags when debug is defined
OPTIMIZATION ?= ${makeInfo.optimization}

ifeq ($(DEBUG),1)
	# Sets debugging optimization -Og and the debug information output
	OPTIMIZATION_FLAGS += -Og -g -gdwarf -ggdb
	TARGET += -debug 
	RELEASE_DIRECTORY ?= $(BUILD_DIRECTORY)/debug
else
	OPTIMIZATION_FLAGS += $(OPTIMIZATION)
	TARGET += -release
	RELEASE_DIRECTORY ?= $(BUILD_DIRECTORY)/release
endif

######################################
# Definitions
######################################

# C definitions
C_DEFINITIONS =  ${'\\'}
${createStringList(makeInfo.cDefs, '-D')}

# C++ definitions
CXX_DEFINITIONS =  ${'\\'}
${createStringList(makeInfo.cxxDefs, '-D')}

# Assembly definitions
AS_DEFINITIONS =  ${'\\'}
${createStringList(makeInfo.asDefs, '-D')}

######################################
# Source Files
######################################


# C sources
C_SOURCES +=  ${'\\'}
${createStringList(makeInfo.cSources)}

CXX_SOURCES += ${'\\'}
${createStringList(makeInfo.cxxSources)}

# ASM sources
AS_SOURCES +=  ${'\\'}
${createStringList(makeInfo.asmSources)}


######################################
# Include Directories
######################################
# AS includes
AS_INCLUDES = ${'\\'}

# C includes
C_INCLUDES =  ${'\\'}
${createStringList(makeInfo.cIncludes, '-I')}


######################################
# Target System Flags
######################################
# The specific flags for the target system
# This sets things like hardware floating point and
# which version a specific Cortex-M processor is.

# cpu
CPU = ${createPrefixWhenNoneExists(makeInfo.cpu, '-mcpu=')}

# fpu
FPU = ${createPrefixWhenNoneExists(makeInfo.fpu, '-mfpu=')}

# float-abi
FLOAT-ABI = ${createPrefixWhenNoneExists(makeInfo.floatAbi, '-mfloat-abi=')}

# mcu
MCU_FLAGS = $(CPU) -mthumb $(FPU) $(FLOAT-ABI)


######################################
# C and CPP Flags
######################################

# additional flags provided by the STM32 for VSCode configuration file
ADDITIONAL_C_FLAGS := ${createSingleLineStringList(makeInfo.cFlags)}
ADDITIONAL_CXX_FLAGS := ${createSingleLineStringList(makeInfo.cxxFlags)}
ADDITIONAL_AS_FLAGS := ${createSingleLineStringList(makeInfo.assemblyFlags)}

# Provides dependency information about header files
# This is used to recompile when a source file depends on
# information from a header file
DEPENDENCY_FLAGS = -MMD -MP -MF"$(@:%.o=%.d)"

# Output a list file for the compiled source file.
# This is a representative of the source code in assembly
ASSEMBLER_LIST_OUTPUT_FLAG = -Wa,-a,-ad,-alms=$(@D)/$($(notdir $@):%.o=%.lst)

# Combining the compilation flags with language specific flags and MCU specific flags
C_FLAGS = ${'\\'}
	$(MCU_FLAGS) ${'\\'}
	$(C_DEFINITIONS) ${'\\'}
	$(C_INCLUDES) ${'\\'}
	$(OPTIMIZATION_FLAGS) ${'\\'}
	$(DEPENDENCY_FLAGS) ${'\\'}
	$(ADDITIONAL_C_FLAGS) ${'\\'}
	$(ASSEMBLER_LIST_OUTPUT_FLAG)

CXX_FLAGS = ${'\\'} 
	$(MCU_FLAGS) ${'\\'}
	$(CXX_DEFINITIONS) ${'\\'}
	$(C_INCLUDES) ${'\\'}
	$(OPTIMIZATION_FLAGS) ${'\\'}
	$(DEPENDENCY_FLAGS) ${'\\'}
	$(ADDITIONAL_CXX_FLAGS) ${'\\'}
	$(ASSEMBLER_LIST_OUTPUT_FLAG)

AS_FLAGS = $(C_FLAGS) $(AS_DEFINITIONS) $(ADDITIONAL_AS_FLAGS)

######################################
# Linker Flags
######################################
# linker script. This script will determine where certain sections will
# be place in memory.
# For a good reference look at: https://blog.thea.codes/the-most-thoroughly-commented-linker-script/
LINKER_SCRIPT := -T${makeInfo.ldscript}

# libraries
LIBRARIES := ${'\\'}
${createStringList(makeInfo.libs, '-l')}

# library directories
LIBRARY_DIRECTORIES := ${'\\'}
${createStringList(makeInfo.libdir, '-L')}

# Additional linker flags Flags from the yaml configuration file
# can be overwritten in the environment file
ADDITIONAL_LINKER_FLAGS ?= ${createSingleLineStringList(makeInfo.ldFlags)}

# Flags for outputting a map file
# -Wl,-Map= flag will output the map file to the specified file
# --cref will generate a cross reference table in the map file
LINKER_MAP_FLAGS ?= -Wl,-Map=$(RELEASE_DIRECTORY)/$(TARGET).map,--cref

# Flags for cleaning up code at link time
# --gc-sections will eliminate dead code e.g. unused functions
LINKER_CLEAN_UP_FLAGS ?= -Wl,--gc-sections

LINKER_FLAGS = ${'\\'}
	$(MCU_FLAGS) ${'\\'}
	$(LINKER_SCRIPT) ${'\\'}
	$(LIBRARY_DIRECTORIES) ${'\\'}
	$(LIBRARIES) ${'\\'}
	$(LINKER_MAP_FLAGS) ${'\\'}
	$(LINKER_CLEAN_UP_FLAGS)

#######################################
# Tools
#######################################
ARM_PREFIX = arm-none-eabi-
POSTFIX = "
PREFIX = "
# The gcc compiler bin path can be defined in the make command via ARM_GCC_PATH variable (e.g.: make ARM_GCC_PATH=xxx)
# or it can be added to the PATH environment variable.
# By default the variable be used from the environment file: ${STM32_ENVIRONMENT_FILE_NAME}.
# if it is not defined 

ifdef ARM_GCC_PATH
		CC = $(PREFIX)$(ARM_GCC_PATH)/$(ARM_PREFIX)gcc$(POSTFIX)
		CXX = $(PREFIX)$(ARM_GCC_PATH)/$(ARM_PREFIX)g++$(POSTFIX)
		AS = $(PREFIX)$(ARM_GCC_PATH)/$(ARM_PREFIX)gcc$(POSTFIX) -x assembler-with-cpp
		CP = $(PREFIX)$(ARM_GCC_PATH)/$(ARM_PREFIX)objcopy$(POSTFIX)
		SZ = $(PREFIX)$(ARM_GCC_PATH)/$(ARM_PREFIX)size$(POSTFIX)
else
	CC ?= $(ARM_PREFIX)gcc
	CXX ?= $(ARM_PREFIX)g++$
	AS ?= $(ARM_PREFIX)gcc -x assembler-with-cpp
	CP ?= $(ARM_PREFIX)objcopy
	SZ ?= $(ARM_PREFIX)size
endif

HEX = $(CP) -O ihex
BIN = $(CP) -O binary -S

# Flash and debug tools
# Default is openocd however will be gotten from the 
OPENOCD ?= openocd

REMOVE_DIRECTORY_COMMAND = rm -fR
MKDIR_COMMAND = mkdir
ifeq ($(OS),Windows_NT)
	REMOVE_DIRECTORY_COMMAND = cmd /c rd /s /q
else
	MKDIR_COMMAND += -p
endif

#######################################
# Build rules 
#######################################

# Create object list
# Create object list
OBJECTS = $(addprefix $(RELEASE_DIRECTORY)/,$(addsuffix .o,$(basename $(C_SOURCES))))
# objects for the different C++ file extensions
OBJECTS += $(addprefix $(RELEASE_DIRECTORY)/,$(addsuffix .o,$(basename $(CXX_SOURCES))))
# Objects for assembly code
OBJECTS += $(addprefix $(RELEASE_DIRECTORY)/,$(addsuffix .o,$(basename $(AS_SOURCES))))

# Dependency files
DEPENDENCY_FILES = $(OBJECTS:.o=.d)


# the tree of folders which needs to be present based on the object files
BUILD_TREE = $(sort $(dir $(OBJECTS)))



#######################################
# Build targets
#######################################
# default action: build all
.PHONY: all
all: $(BUILD_DIR)/$(TARGET).elf $(BUILD_DIR)/$(TARGET).hex $(BUILD_DIR)/$(TARGET).bin

# Makes the build directory
$(BUILD_DIRECTORY):
\t$(MKDIR_COMMAND) $@

# Makes the release folder
$(RELEASE_DIRECTORY): | $(BUILD_DIRECTORY)
\t$(MKDIR_COMMAND) $@

$(BUILD_TREE):
\t$(MKDIR_COMMAND) $@


#######################################
# Build Firmware
#######################################

FINAL_TARGET_NAME = $(RELEASE_DIRECTORY)/$(TARGET)
ELF_TARGET = $(FINAL_TARGET_NAME).elf

$(FINAL_TARGET_NAME).elf: $(OBJECTS) ${makefileName} 
\t$(CC) $(OBJECTS) $(LDFLAGS) -o $@
\t$(SZ) $@

$(FINAL_TARGET_NAME).hex: $(FINAL_TARGET_NAME).elf 
\t$(HEX) $< $@

$(FINAL_TARGET_NAME).bin: $(FINAL_TARGET_NAME).elf 
\t$(BIN) $< $@


#######################################
# Build rules
#######################################

sourcefile = $(patsubst $(RELEASE_FOLDER)/%.o,%.c,$(1))
# Rules for creating the object files from the source files
# c files
$(RELEASE_DIRECTORY)/%.o: %.c $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CC) $(C_FLAGS) -c $< -o $@

# cpp files
$(RELEASE_DIRECTORY)/%.o: %.cpp $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.cc $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.cp $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.CPP $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.c++ $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.C++ $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@

# assembly files
$(RELEASE_DIRECTORY)/%.o: %.s $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@
$(RELEASE_DIRECTORY)/%.o: %.S $(RELEASE_DIRECTORY)/%.d | $(BUILD_TREE)
\t$(CXX) $(CXX_FLAGS) -c $< -o $@

#######################################
# Build targets
#######################################
# Makes the build directory
$(BUILD_DIRECTORY):
\t$(MKDIR_COMMAND) $@

# Makes the release folder
$(RELEASE_DIRECTORY): | $(BUILD_DIRECTORY)
\t$(MKDIR_COMMAND) $@

$(BUILD_TREE):
\t$(MKDIR_COMMAND) $@

#######################################
# All
#######################################
# default action: build all
.PHONY: all
all: $(FINAL_TARGET_NAME).elf $(FINAL_TARGET_NAME).hex $(FINAL_TARGET_NAME).bin

#######################################
# flash
#######################################
flash: $(FINAL_TARGET_NAME).elf
\t$(OPENOCD) -f ./openocd.cfg -c "program $(FINAL_TARGET_NAME).elf verify reset exit"

#######################################
# erase
#######################################
erase: $(BUILD_DIR)/$(TARGET).elf
\t$(OPENOCD) -f ./openocd.cfg -c "init; reset halt; ${makeInfo.targetMCU} mass_erase 0; exit"

#######################################
# clean up
#######################################

clean:
\t$(REMOVE_DIRECTORY_COMMAND) $(BUILD_DIR)

#######################################
# custom makefile rules
#######################################

${customMakefileRules(makeInfo)}
	
#######################################
# dependencies
#######################################
-include $(wildcard $(RELEASE_DIRECTORY)/*.d)

# *** EOF ***`;
}