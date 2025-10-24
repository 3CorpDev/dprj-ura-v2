'use client';

import { useState } from 'react';
import PageDash from './dash';
import PageRel from './report';

export default function Tabs() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      title: "Dashboard",
      component: <PageDash />
    },
    {
      title: "Relatórios",
      component: <PageRel />
    }
  ];

  return (
    <div className="w-full">
      {/* Cabeçalho das Abas */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`py-3 px-6 font-medium text-sm transition-colors ${
              activeTab === index
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
        {tabs[activeTab].component}
    </div>
  );
}