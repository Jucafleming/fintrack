import { Sun, Moon, ChevronDown } from 'lucide-react';
import { useThemeStore } from '@/store/theme.store';
import { useGroupStore } from '@/store/group.store';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { useGroups } from '@/hooks/useGroups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { activeGroup, setActiveGroup } = useGroupStore();
  const { data: groups } = useGroups();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* spacer for mobile menu button */}
      <div className="w-10 lg:hidden" />

      {/* Group selector */}
      <div className="flex-1">
        {groups && groups.length > 0 && (
          <Select
            value={activeGroup?.id ?? ''}
            onValueChange={(id) => {
              const g = groups.find((g) => g.id === id);
              if (g) setActiveGroup(g);
            }}
          >
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Selecionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
