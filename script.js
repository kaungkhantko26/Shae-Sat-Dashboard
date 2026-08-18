const bars = document.querySelectorAll('.bar-fill');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const el = e.target;
        el.style.width = el.dataset.w + '%';
        io.unobserve(el);
      }
    });
  }, { threshold: 0.2 });
  bars.forEach(b => io.observe(b));
