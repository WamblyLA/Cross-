import {useState} from 'react'
import { dropbarContext } from '../../contexts/DropbarContext';
//На будущее: 4 возможных направления, показывают направление открытия меню
//Right, Left, Up, Down
export default function DropBar({children, dir = "down"}: {children: React.ReactNode, dir?: string}) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <dropbarContext.Provider value = {{isOpen, setIsOpen, dir}}>
        <div className='relative inline-block z-20'>
            {children}
        </div>
    </dropbarContext.Provider>
  )
}
