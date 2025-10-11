import {
    closestCenter,
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { render } from '@testing-library/react';
import React from 'react';

function SortableItem({ id }: { id: string }) {
    const { attributes, listeners, setNodeRef } = useSortable({ id });
    return (
        <div ref={setNodeRef} {...attributes} {...listeners} data-testid={`item-${id}`}>
            {id}
        </div>
    );
}

function TestSortableList() {
    const [items, setItems] = React.useState(['a', 'b']);
    const sensors = useSensors(useSensor(PointerSensor));
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = items.indexOf(active.id as string);
            const newIndex = items.indexOf(over.id as string);
            const newItems = [...items];
            const [moved] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, moved);
            setItems(newItems);
        }
    }
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.map((id) => (
                    <SortableItem key={id} id={id} />
                ))}
            </SortableContext>
        </DndContext>
    );
}

describe('dnd-kit sortable', () => {
    it('mounts sortable list without throwing', () => {
        expect(() => render(<TestSortableList />)).not.toThrow();
    });
});
