/**
 * 🔀 Drag & Drop Module
 * Blokların sürükle-bırak ile sıralama mekanizması.
 */

let dragSrcIndex = null;

export function setupDragAndDrop(container, State, renderBuilder) {
    const items = container.querySelectorAll('.block-item');
    items.forEach(item => {
        item.ondragstart = (e) => {
            dragSrcIndex = parseInt(item.dataset.blockIndex);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        };
        item.ondragend = () => {
            item.classList.remove('dragging');
            items.forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        };
        item.ondragover = (e) => {
            e.preventDefault();
            const targetIndex = parseInt(item.dataset.blockIndex);
            if (targetIndex !== dragSrcIndex) {
                items.forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
                const rect = item.getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) item.classList.add('drag-over-top');
                else item.classList.add('drag-over-bottom');
            }
        };
        item.ondrop = (e) => {
            const from = dragSrcIndex;
            const to = parseInt(item.dataset.blockIndex);
            if (from !== to) {
                State.moveTo(from, to);
                renderBuilder();
            }
        };
    });
}
