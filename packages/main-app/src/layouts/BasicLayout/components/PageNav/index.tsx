// import { AppLink } from '@ice/stark';
// import { asideMenuConfig } from '../../menuConfig';

// export interface IMenuItem {
//   name: string;
//   path: string;
//   icon?: string;
//   children?: IMenuItem[];
// }

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

export default () => {
  return <div>nav bar</div>;
};
