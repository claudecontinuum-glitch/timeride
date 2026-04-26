---
name: warn-readme-drift
enabled: true
event: stop
pattern: .*
action: warn
---

Antes de cerrar la sesion, si tocaste codigo en este repo (timeride):

**Verificar el README:**

- [ ] Sigue siendo verdadero? Revisar que pitch, stack, "como correr", URL beta sigan vigentes
- [ ] Lista archivos o features que ya no existen? Borrarlos
- [ ] Falta mencionar algo grande nuevo (branch en uso, integracion, feature en prod)?

**Filosofia:** README solo contiene lo que casi nunca cambia. Detalles volatiles (estructura, decisiones, TODOs) viven en `Alexandria/Proyectos/timeride/CODEBASE.md` — README solo apunta ahi.

Si el README sigue siendo verdadero, proceder. Si no, actualizar antes de cerrar.
