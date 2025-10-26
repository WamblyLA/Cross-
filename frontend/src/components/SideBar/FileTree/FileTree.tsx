import React from 'react'
import TreeItem from './TreeItem';
import type {TreeItemType} from './TreeItem';
interface FileTreeProps {
  treeData?: TreeItemType[];
}
const FileTree: React.FC<FileTreeProps> = ({treeData}) => {
  const clicked = (file: TreeItemType) => {
    console.log(file.name, ' открыт');
  }
  return (
    <div className='w-full h-full py-1 px-2'>
      {treeData?.map((unit: TreeItemType) => (
        <TreeItem key={unit.id} unit={unit} onUnitClick={clicked} />
      ))}
    </div>
  )
}
export default FileTree