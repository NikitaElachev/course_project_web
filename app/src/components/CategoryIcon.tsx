import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

// Принимает строковое имя иконки и возвращает иконку из библиотеки lucide-react
export default function CategoryIcon({ name, className = "w-4 h-4" }: CategoryIconProps) {
  switch (name) {
    case 'Coins':
      return <Icons.Coins className={className} />;
    case 'Laptop':
      return <Icons.Laptop className={className} />;
    case 'Gift':
      return <Icons.Gift className={className} />;
    case 'ShoppingBag':
      return <Icons.ShoppingBag className={className} />;
    case 'Home':
      return <Icons.Home className={className} />;
    case 'Car':
      return <Icons.Car className={className} />;
    case 'Gamepad':
      return <Icons.Gamepad className={className} />;
    case 'CreditCard':
      return <Icons.CreditCard className={className} />;
    case 'Bank':
    case 'HomeRepair':
    case 'Briefcase':
      return <Icons.Briefcase className={className} />;
    case 'Safe':
    case 'Lock':
      return <Icons.Lock className={className} />;
    case 'Wallet':
      return <Icons.Wallet className={className} />;
    default:
      return <Icons.Grid className={className} />;
  }
}