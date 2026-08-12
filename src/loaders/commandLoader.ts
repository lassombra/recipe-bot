import {Command} from '../command.js';

interface CommandConstructor {
    new (): Command;
}

export function loadAllCommands(): Command[] {
    const modules = import.meta.glob('../commands/**/*.ts', { eager: true })
    const commands: Command[] = [];
    
    for (const path in modules) {
        const module = modules[path] as Record<string, unknown>;
        for (const exportName in module) {
            const exported = module[exportName] as unknown;
            if (typeof exported === 'function' && exported.prototype instanceof Command) {
                commands.push(new (exported as CommandConstructor)());
            }
        }
    }

    return commands;
}