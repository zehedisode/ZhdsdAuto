/**
 * Block Helper Functions
 * createBlock ve validateBlock fonksiyonları.
 * Blok tanımları constants.js'ten gelir.
 */
import { BLOCK_TYPES } from './constants.js';

const BLOCK_LIST = Object.values(BLOCK_TYPES);

/**
 * Yeni bir blok örneği oluştur
 * @param {string} typeId - Blok tipi (örn: 'click', 'type', 'navigate')
 * @returns {Object} Yeni blok nesnesi
 */
export function createBlock(typeId) {
    const typeDef = BLOCK_LIST.find(b => b.id === typeId);
    if (!typeDef) throw new Error(`Bilinmeyen blok tipi: ${typeId}`);

    const params = {};
    typeDef.params.forEach(p => {
        params[p.key] = p.default !== undefined ? p.default : '';
    });

    return {
        id: crypto.randomUUID(),
        type: typeId,
        params,
        enabled: true
    };
}

/**
 * Bloku doğrula — zorunlu alanları kontrol et
 * @param {Object} block - Doğrulanacak blok
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBlock(block) {
    const typeDef = BLOCK_LIST.find(b => b.id === block.type);
    if (!typeDef) return { valid: false, error: 'Bilinmeyen blok tipi' };

    for (const param of typeDef.params) {
        if (param.required && !block.params[param.key]) {
            return { valid: false, error: `"${param.label}" alanı zorunlu` };
        }
    }
    return { valid: true };
}

/**
 * Blok tipinden isim ve ikon bilgisini al
 * @param {string} typeId - Blok tipi
 * @returns {{ name: string, icon: string }}
 */
export function getBlockMeta(typeId) {
    const def = BLOCK_TYPES[typeId] || BLOCK_LIST.find(b => b.id === typeId);
    if (def) return { name: def.name, icon: def.icon };
    return { name: typeId, icon: '⚡' };
}
