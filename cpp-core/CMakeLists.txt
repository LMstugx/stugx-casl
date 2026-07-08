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

set(CORE_TESTS
  AssembleSimpleProgram
  AssembleChangedConstants
  AssembleChangedLabels
  DuplicateLabel_ShouldError
  AssembleInvalidRegister
  AssembleUndefinedLabel
  AssembleUnknownOpcode
  AssembleInvalidNumericLiteral
  StepLd
  StepAdda
  StepStore
  StepRetFinished
  ExecuteGr2Program
  Run_ShouldStopAtMaxSteps
  MemoryAccess_OutOfRange_ShouldError
)

foreach(test_name IN LISTS CORE_TESTS)
  add_test(NAME ${test_name} COMMAND CoreSmokeTest ${test_name})
endforeach()
