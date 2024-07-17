import { useState } from 'react';

const Sidebar = ({ navItems }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNavItems = navItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white h-screen p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ul className="space-y-2">
          {filteredNavItems.map(item => (
            <li key={item.name}>
              <a
                target='_blank'
                href={item.url}
                className="block py-2 px-4 rounded hover:bg-gray-700"
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {/* Content area */}
      <div className="flex-1 p-10">
        <h1 className="text-3xl font-bold">Content Area</h1>
        <p>Here is the main content of the website.</p>
      </div>
    </div>
  );
};


const navItems = [
    { name: 'chrome代理1', url: 'https://github.jbcj.top/https/www.google.com' },
    { name: 'chrome代理2', url: '#about' },
    { name: 'fofa siteproxy代理', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eeS7o%2BeQhiI%3D' },
    { name: 'fofa siteproxy', url: 'https://en.fofa.info/result?qbase64=dGl0bGU9InNpdGVwcm94eSI%3D' },
    { name: '360 siteproxy', url: 'https://quake.360.net/quake/#/index'},
    { name: '', url: ''},
    { name: '', url: ''},
    { name: '', url: ''},
    { name: '', url: ''},
  ];

export default () => {
    return (
        <Sidebar navItems={navItems} />
    )
};
