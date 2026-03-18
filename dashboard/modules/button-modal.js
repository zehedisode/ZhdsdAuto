/**
 * 🔘 Button Modal HTML Template
 * Modal HTML'ini dinamik olarak sayfaya enjekte eder.
 */

export function injectButtonModal() {
    const dialog = document.createElement('dialog');
    dialog.id = 'buttonModal';
    dialog.className = 'modal';
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-left">
                    <div class="modal-header-icon">🔘</div>
                    <div>
                        <h3>Buton Düzenle</h3>
                        <div class="modal-header-subtitle">Web sayfasına akış başlatıcı buton ekleyin</div>
                    </div>
                </div>
                <button class="btn-icon" id="closeButtonModal">×</button>
            </div>
            <div class="modal-body">
                <form id="buttonForm">
                    <input type="hidden" id="btnId">

                    <!-- Section: Temel Ayarlar -->
                    <div class="modal-section">
                        <div class="modal-section-title">
                            <span class="section-icon">⚙️</span>
                            <span>Temel Ayarlar</span>
                            <span class="section-line"></span>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">⚡</span>
                                Akış Seç
                                <span class="label-badge">zorunlu</span>
                            </label>
                            <select id="btnFlowSelect" class="input" required>
                                <option value="" disabled selected>Bir akış seçin...</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">🌐</span>
                                Hedef Site (URL Filtresi)
                            </label>
                            <input type="text" id="btnUrl" class="input" placeholder="örn: canva.com" required>
                            <div class="hint">
                                <span class="hint-icon">💡</span>
                                <span>URL'de bu metin geçen tüm sayfalarda buton görünür. Örneğin <strong>canva</strong>
                                    yazarsanız canva.com'un tüm sayfalarında aktif olur.</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">✏️</span>
                                Buton Metni
                            </label>
                            <input type="text" id="btnLabel" class="input" placeholder="Çalıştır" required>
                        </div>
                    </div>

                    <div class="modal-divider"></div>

                    <!-- Section: Görünüm -->
                    <div class="modal-section">
                        <div class="modal-section-title">
                            <span class="section-icon">🎨</span>
                            <span>Görünüm</span>
                            <span class="section-line"></span>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">🎨</span>
                                Renk
                            </label>
                            <div class="color-picker" id="colorPicker">
                                <div class="color-option selected" data-color="#3b82f6"
                                    style="background: linear-gradient(135deg, #3b82f6, #2563eb);"></div>
                                <div class="color-option" data-color="#ef4444"
                                    style="background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
                                <div class="color-option" data-color="#10b981"
                                    style="background: linear-gradient(135deg, #10b981, #059669);"></div>
                                <div class="color-option" data-color="#f59e0b"
                                    style="background: linear-gradient(135deg, #f59e0b, #d97706);"></div>
                                <div class="color-option" data-color="#6366f1"
                                    style="background: linear-gradient(135deg, #6366f1, #4f46e5);"></div>
                                <div class="color-option" data-color="#8b5cf6"
                                    style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"></div>
                                <div class="color-option" data-color="#ec4899"
                                    style="background: linear-gradient(135deg, #ec4899, #db2777);"></div>
                                <div class="color-option" data-color="#06b6d4"
                                    style="background: linear-gradient(135deg, #06b6d4, #0891b2);"></div>
                                <div class="color-option" data-color="#000000"
                                    style="background: linear-gradient(135deg, #1e293b, #0f172a);"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">📏</span>
                                Boyut
                            </label>
                            <div class="size-picker" id="sizePicker">
                                <div class="size-option selected" data-size="sm">
                                    <span class="size-preview">Aᴬ</span>
                                    <span class="size-label">Küçük</span>
                                </div>
                                <div class="size-option" data-size="md">
                                    <span class="size-preview">Aᴬ</span>
                                    <span class="size-label">Normal</span>
                                </div>
                                <div class="size-option" data-size="lg">
                                    <span class="size-preview">Aᴬ</span>
                                    <span class="size-label">Büyük</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="modal-divider"></div>

                    <!-- Section: Konum -->
                    <div class="modal-section">
                        <div class="modal-section-title">
                            <span class="section-icon">📍</span>
                            <span>Konum</span>
                            <span class="section-line"></span>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">🖥️</span>
                                Sayfadaki Konum
                            </label>
                            <div class="position-picker" id="positionPicker">
                                <div class="pos-option" data-pos="top-left" title="Sol Üst">
                                    ↖ <span class="pos-label">Sol Üst</span>
                                </div>
                                <div class="pos-option" data-pos="top-right" title="Sağ Üst">
                                    ↗ <span class="pos-label">Sağ Üst</span>
                                </div>
                                <div class="pos-option" data-pos="bottom-left" title="Sol Alt">
                                    ↙ <span class="pos-label">Sol Alt</span>
                                </div>
                                <div class="pos-option" data-pos="bottom-right" title="Sağ Alt">
                                    ↘ <span class="pos-label">Sağ Alt</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-divider"></div>

                    <!-- Section: Gelişmiş Ayarlar -->
                    <div class="modal-section">
                        <div class="modal-section-title">
                            <span class="section-icon">🔧</span>
                            <span>Gelişmiş</span>
                            <span class="section-line"></span>
                        </div>

                        <div class="form-group">
                            <label>
                                <span class="label-icon">💬</span>
                                Tooltip (Fare Üstü Yazısı)
                            </label>
                            <input type="text" id="btnTooltip" class="input" placeholder="Otomasyon başlat...">
                        </div>

                        <div class="toggle-field" id="pulseToggle">
                            <div class="toggle-field-text">
                                <span class="toggle-field-label">✨ Dikkat Çekici Animasyon</span>
                                <span class="toggle-field-desc">Buton hafif bir pulse animasyonu ile vurgulanır</span>
                            </div>
                            <div class="toggle-switch active" id="pulseSwitch"></div>
                        </div>
                    </div>

                    <div class="modal-divider"></div>

                    <!-- Section: Önizleme -->
                    <div class="modal-section">
                        <div class="modal-section-title">
                            <span class="section-icon">👁️</span>
                            <span>Önizleme</span>
                            <span class="section-line"></span>
                        </div>

                        <div class="live-preview" id="livePreview">
                            <div class="live-preview-label">Butonunuz böyle görünecek</div>
                            <div class="preview-button" id="previewButton"
                                style="background: #3b82f6; bottom: 16px; right: 16px;">
                                ▶ Çalıştır
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline" id="cancelButtonModal">İptal</button>
                        <button type="submit" class="btn btn-primary">💾 Kaydet</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}
