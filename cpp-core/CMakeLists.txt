cmake_minimum_required(VERSION 3.20)

project(CASLStudioNextCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(casl_core
  src/CaslParser.cpp
  src/Assembler.cpp
  src/CometVm.cpp
  src/SourceMap.cpp
  src/InstructionSet.cpp
  src/Format.cpp
)

target_include_directories(casl_core PUBLIC include)

enable_testing()

add_executable(CoreSmokeTest tests/CoreSmokeTest.cpp)
target_link_libraries(CoreSmokeTest PRIVATE casl_core)

add_test(NAME CoreSmokeTest COMMAND CoreSmokeTest)
