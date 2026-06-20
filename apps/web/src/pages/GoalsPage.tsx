import { Link } from 'react-router-dom';

export default function GoalsPage() {
  return (
    <div className="px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的目标</h1>
        <button className="btn-primary text-sm">+ 新建目标</button>
      </header>

      {/* 目标类型说明 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { type: '累计型', desc: '月跑量 100km', icon: '📊' },
          { type: '频次型', desc: '每周跑 3 次', icon: '🔄' },
          { type: '配速型', desc: '5K 进 5:30', icon: '⚡' },
          { type: '距离型', desc: '单次半马 21km', icon: '🏃' },
        ].map((item) => (
          <div key={item.type} className="card text-center py-3 cursor-pointer hover:opacity-80 transition-opacity">
            <p className="text-2xl mb-1">{item.icon}</p>
            <p className="text-sm font-medium">{item.type}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 目标列表 */}
      <div className="card text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
        <p className="text-sm">还没有创建目标</p>
        <p className="text-xs mt-1">设定你的第一个跑步目标吧</p>
      </div>
    </div>
  );
}
