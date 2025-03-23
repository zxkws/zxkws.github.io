// import { AppLink } from '@ice/stark';
import * as React from 'react';
import { asideMenuConfig } from '../../menuConfig';
import * as styles from './index.module.css';

export interface IMenuItem {
  name: string;
  path: string;
  icon?: string;
  children?: IMenuItem[];
}

// function getNavMenuItems(menusData: any[], isCollapse: boolean) {
//   if (!menusData) {
//     return [];
//   }

//   return menusData
//     .filter((item) => item.name && !item.hideInMenu)
//     .map((item, index) => {
//       return getSubMenuOrItem(item, index, isCollapse);
//     });
// }

// function getSubMenuOrItem(item: IMenuItem, index: number, isCollapse: boolean) {
//   if (item.children && item.children.some((child) => child.name)) {
//     const childrenItems = getNavMenuItems(item.children, false);
//     if (childrenItems && childrenItems.length > 0) {
//       const subNav = { childrenItems };

//       return subNav;
//     }
//     return null;
//   }
//   const navItem = <AppLink to={item.path}>{item.name}</AppLink>;

//   return navItem;
// }

// const Navigation = (_, context) => {
//   const { isCollapse } = context;

//   return <>{getNavMenuItems(asideMenuConfig, isCollapse)}</>;
// };

const Nav = ({ menus = asideMenuConfig, textIndent = 0 } = {}) => {
  return (
    <div className={styles['sidebar-width']} style={{ marginLeft: textIndent + 'px' }}>
      {menus.map((item) => (
        <div key={item.name}>
          {item.children ? (
            <Nav textIndent={textIndent + 16} menus={item.children} />
          ) : (
            <AppLink to={item.path}>{item.name}</AppLink>
          )}
        </div>
      ))}
    </div>
  );
};

export default Nav;

export type AppLinkProps = {
  to: string;
  hashType?: boolean;
  replace?: boolean;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<any>;

export const AppLink: React.FC<AppLinkProps> = (props: AppLinkProps) => {
  const { to, hashType, replace, children, ...rest } = props;
  const linkTo = hashType && to.indexOf('#') === -1 ? `/#${to}` : to;
  return (
    <a
      {...rest}
      onClick={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </a>
  );
};
