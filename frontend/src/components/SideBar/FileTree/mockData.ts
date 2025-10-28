import type { TreeItemType } from "../FileTree/TreeItem"

const mockData: TreeItemType[] = [
  {
    id: "proj",
    name: "project",
    type: "folder",
    children: [
      {
        id: "src",
        name: "src",
        type: "folder",
        children: [
          {
            id: "main_cpp",
            name: "main",
            type: "file",
            extencion: "cpp",
            content: `#include <iostream>
#include "utils.h"

int main() {
    std::cout << "Hello, Cross++!" << std::endl;
    return 0;
}`,
          },
          {
            id: "utils_cpp",
            name: "utils",
            type: "file",
            extencion: "cpp",
            content: `#include "utils.h"

int add(int a, int b) {
    return a + b;
}`,
          },
          {
            id: "utils_h",
            name: "utils",
            type: "file",
            extencion: "h",
            content: `#pragma once

int add(int a, int b);`,
          },
        ],
      },
      {
        id: "include",
        name: "include",
        type: "folder",
        children: [
          {
            id: "project_h",
            name: "project",
            type: "file",
            extencion: "h",
            content: `#pragma once
// Public headers for project`,
          },
        ],
      },
      {
        id: "README",
        name: "README",
        type: "file",
        extencion: "md",
        content: `# Project readme

This is mock project for Cross++ IDE.`,
      },
      {
        id: "build",
        name: "build_config",
        type: "file",
        extencion: "json",
        content: `{
  "compiler": "gcc",
  "flags": ["-std=c++17", "-O2"]
}`,
      },
    ],
  },
  {
    id: "tools",
    name: "tools",
    type: "folder",
    children: [
      {
        id: "run_sh",
        name: "run",
        type: "file",
        extencion: "sh",
        content: `#!/bin/bash
g++ src/main.cpp src/utils.cpp -o out && ./out`,
      },
    ],
  },
];

export default mockData;
