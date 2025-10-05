import React from 'react';
interface TopBarItemProps {
    label: string;
}
const TopBarItem = React.forwardRef<HTMLDivElement, TopBarItemProps>(({label}, ref) => {
  return (
    <div className="text-xs px-1 py-1 rounded" ref={ref}>{label}</div>
  );
});

export default TopBarItem;
