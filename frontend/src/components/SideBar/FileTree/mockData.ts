import type { TreeItemType } from './TreeItem';
const mockData: TreeItemType[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    children: [
      { id: '2', name: 'index', type: 'file', extencion: 'ts' },
      { id: '3', name: 'App', type: 'file', extencion: 'tsx' },
      {
        id: '4',
        name: 'components',
        type: 'folder',
        children: [
          { id: '5', name: 'Button', type: 'file', extencion: 'tsx' },
          { id: '6', name: 'Input', type: 'file', extencion: 'tsx' },
        ],
      },
    ],
  },
  {
    id: '7',
    name: 'package',
    type: 'file',
    extencion: 'json',
  },
];
export default mockData;