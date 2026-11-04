interface OrderedPosition {
    position_name: string;
    executive?: boolean;
    position_id: string;
}

const priorityNames = [
    'president',
    'vice-president',
    'treasurer',
    'secretary',
    'partnerships & sponsorships manager',
];

function priority(position: OrderedPosition): number {
    const name = position.position_name.trim().toLowerCase();
    const namedPriority = priorityNames.indexOf(name);
    if (namedPriority !== -1) return namedPriority;
    if (position.executive) return priorityNames.length;
    if (name.includes('manager')) return priorityNames.length + 1;
    return priorityNames.length + 2;
}

export function compareResultPositions(
    a: OrderedPosition,
    b: OrderedPosition,
): number {
    return (
        priority(a) - priority(b) ||
        a.position_name.localeCompare(b.position_name) ||
        a.position_id.localeCompare(b.position_id)
    );
}
