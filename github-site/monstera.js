// <monstera-3d src="..." still="..."> — GLB that rotates and zooms as the section crosses the viewport.
// Falls back to the still image when WebGL is unavailable, on narrow screens, or with prefers-reduced-motion.
class Monstera3D extends HTMLElement {
  connectedCallback() {
    if (this._up) return;
    this._up = true;
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = '100%';
    this.style.minHeight = '380px';
    this.style.position = this.style.position || 'relative';
    const still = this.getAttribute('still');
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = innerWidth < 720;
    const fallback = () => {
      if (still) {
        const img = document.createElement('img');
        img.src = still;
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
        this.appendChild(img);
        return;
      }
      const host = this.closest('[data-viveiro-3d]') || this;
      host.style.display = 'none';
    };
    if (narrow) return fallback();
    this.init().catch(err => { console.warn('[monstera-3d]', err); fallback(); });
  }

  async init() {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    this.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xf5ead8, 0x272e1b, 1.5));
    const key = new THREE.DirectionalLight(0xfff4e2, 2.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb87a, 1.1);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);
    const gltf = await new GLTFLoader().loadAsync(this.getAttribute('src'));
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const scale = 2.6 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    group.add(model);

    const resize = () => {
      const w = this.clientWidth || 1, h = this.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    new ResizeObserver(resize).observe(this);

    let progress = 0, target = 0, drag = 0, dragTarget = 0, spin = 0;
    let down = null;
    this.style.cursor = 'grab';
    this.style.touchAction = 'pan-y';
    const onDown = e => { down = e.clientX; this.style.cursor = 'grabbing'; this.setPointerCapture(e.pointerId); };
    const onMove = e => { if (down === null) return; dragTarget += (e.clientX - down) * 0.008; down = e.clientX; };
    const onUp = e => { down = null; this.style.cursor = 'grab'; try { this.releasePointerCapture(e.pointerId); } catch (_) {} };
    this.addEventListener('pointerdown', onDown);
    this.addEventListener('pointermove', onMove);
    this.addEventListener('pointerup', onUp);
    this.addEventListener('pointercancel', onUp);

    const measure = () => {
      const r = this.getBoundingClientRect();
      const span = innerHeight + r.height;
      target = Math.min(1, Math.max(0, (innerHeight - r.top) / span));
    };
    measure();
    addEventListener('scroll', measure, { passive: true });
    addEventListener('resize', measure);

    renderer.setAnimationLoop(() => {
      progress += (target - progress) * 0.07;
      drag += (dragTarget - drag) * 0.12;
      if (down === null && !this.reduced) spin += 0.0016;
      const t = performance.now() / 1000;
      group.rotation.y = -0.7 + progress * 2.2 + drag + spin + Math.sin(t * 0.25) * 0.05;
      group.rotation.x = 0.12 - progress * 0.22;
      group.position.y = -0.15 + Math.sin(t * 0.4) * 0.03;
      camera.position.set(0, 0.2, 6.4 - progress * 2.7);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    });
  }
}
customElements.define('monstera-3d', Monstera3D);
