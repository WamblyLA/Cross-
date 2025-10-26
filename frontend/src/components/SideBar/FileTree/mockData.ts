import type { TreeItemType } from "./TreeItem";

const mockData: TreeItemType[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    children: [
      {
        id: "2",
        name: "index",
        type: "file",
        extencion: "ts",
        content: `console.log('Hello from index.ts');`,
      },
      {
        id: "3",
        name: "App",
        type: "file",
        extencion: "tsx",
        content: `
import React from 'react';

export default function App() {
  return <div>Hello, world!</div>;
}
        `,
      },
      {
        id: "4",
        name: "components",
        type: "folder",
        children: [
          {
            id: "5",
            name: "Button",
            type: "file",
            extencion: "tsx",
            content: `
import React from 'react';
export const Button = ({ label }: { label: string }) => (
  <button className='px-4 py-1 bg-blue-500 text-white rounded'>{label}</button>
);
            `,
          },
          {
            id: "6",
            name: "Input",
            type: "file",
            extencion: "tsx",
            content: `
import React from 'react';
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className='border rounded p-1' />
);
            `,
          },
        ],
      },
    ],
  },
  {
    id: "7",
    name: "package",
    type: "file",
    extencion: "json",
    content: `{
  "name": "crosspp",
  "version": "1.0.0",
  "dependencies": {}
}`,
  },
];

export default mockData;
