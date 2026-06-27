import { useMemo, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

const CommandPalette = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(command => {
      return command.label.toLowerCase().includes(needle)
        || command.description?.toLowerCase().includes(needle)
        || command.keywords?.some(keyword => keyword.toLowerCase().includes(needle));
    });
  }, [commands, query]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Gõ lệnh hoặc thư mục cần thao tác..."
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter' && filtered[0] && !filtered[0].disabled) {
                filtered[0].run();
                onClose();
              }
            }}
          />
        </div>

        <div className="command-list">
          {filtered.length === 0 ? (
            <div className="command-empty">Không có lệnh phù hợp</div>
          ) : filtered.map(command => (
            <button
              key={command.id}
              type="button"
              className="command-item"
              disabled={command.disabled}
              onClick={() => {
                command.run();
                onClose();
              }}
            >
              <div>
                <div className="command-title">{command.label}</div>
                {command.description && <div className="command-description">{command.description}</div>}
              </div>
              <CornerDownLeft size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
