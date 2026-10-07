/**
 * Árbol maestro de procesos + utilidad de búsqueda de ruta.
 * Vive en shared/utils/ (no en layout/) porque lo consumen tanto piezas
 * del shell (layout/process-menu-tree, layout/create-document) como
 * utilidades transversales de shared (breadcrumbs.util) — shared no debe
 * depender de layout, así que la fuente de verdad va acá.
 */
export interface ProcessMenuNode {
  id: string;
  label: string;
  selected?: boolean;
  // Marca la rama para que arranque abierta. Se respeta en cualquier nivel, no solo en la raíz.
  expanded?: boolean;
  // Ruta de la página principal del módulo (documentos y registros)
  moduleRoute?: string;
  // Si un nodo tiene estas propiedades, Crear documento puede completar documento/tipo y navegar.
  createRoute?: string;
  documentOptions?: string[];
  documentCreateOptions?: Array<{
    label: string;
    route?: string;
    actionTypes?: string[];
  }>;
  actionTypeOptions?: string[];
  /**
   * Marca un nodo como módulo planificado pero aún no implementado.
   * El menú lo renderiza con texto atenuado y badge "Próximamente",
   * y el click no navega (solo expande si tiene hijos).
   */
  comingSoon?: boolean;
  children?: ProcessMenuNode[];
}

/**
 * Árbol de procesos del taller: refleja el menú del módulo de deuda del SIAF-RP. Ninguno de esos procesos tiene página
 * real todavía, así que van como planificados («Próximamente»): no navegan, solo expanden. El único proceso funcional
 * (con datos simulados) es «Registro de cuentas bancarias», que se conserva bajo «Gestión de tesorería» al final del
 * árbol como demo y para no romper las migas de pan.
 *
 * El contenido interno de las ramas de deuda todavía colapsadas es un placeholder (`Documentos y registros… /
 * Consultas y reportes…`, el patrón del repo): la imagen del menú no lo revelaba. Reemplazar por los sub-procesos
 * reales cuando se definan. Para sumar un proceso funcional: una hoja con `moduleRoute` (Documentos y registros) y
 * otra para sus consultas, y sus rutas en `app.routes.ts`.
 *
 * IDs consumidos por componentes externos (migas de pan con `findProcessPathById`):
 *   - registro-cuentas-bancarias-documentos
 *   - registro-cuentas-bancarias-consultas
 */
export const DEFAULT_PROCESS_TREE: ProcessMenuNode[] = [
  {
    id: 'concertaciones',
    label: 'Concertaciones',
    comingSoon: true,
    children: [
      { id: 'concertaciones-documentos', label: 'Documentos y registros de concertaciones', comingSoon: true },
      { id: 'concertaciones-consultas', label: 'Consultas y reportes de concertaciones', comingSoon: true },
    ],
  },
  {
    id: 'modulo-desembolsos',
    label: 'Módulo de desembolsos',
    comingSoon: true,
    children: [
      { id: 'modulo-desembolsos-documentos', label: 'Documentos y registros de desembolsos', comingSoon: true },
      { id: 'modulo-desembolsos-consultas', label: 'Consultas y reportes de desembolsos', comingSoon: true },
    ],
  },
  {
    id: 'servicio-deuda',
    label: 'Servicio de la deuda',
    comingSoon: true,
    children: [
      { id: 'servicio-deuda-documentos', label: 'Documentos y registros del servicio de la deuda', comingSoon: true },
      { id: 'servicio-deuda-consultas', label: 'Consultas y reportes del servicio de la deuda', comingSoon: true },
    ],
  },
  {
    id: 'pagos',
    label: 'Pagos',
    comingSoon: true,
    children: [
      { id: 'pagos-documentos', label: 'Documentos y registros de pagos', comingSoon: true },
      { id: 'pagos-consultas', label: 'Consultas y reportes de pagos', comingSoon: true },
    ],
  },
  {
    id: 'programacion-presupuestal-deuda',
    label: 'Programación presupuestal de deuda',
    comingSoon: true,
    children: [
      {
        id: 'prog-presup-configuracion',
        label: 'Configuración de parámetros presupuestales',
        comingSoon: true,
      },
      {
        id: 'prog-presup-procesos',
        label: 'Procesos',
        comingSoon: true,
        children: [
          { id: 'prog-presup-proyeccion-desembolsos', label: 'Proyección de desembolsos', comingSoon: true },
          {
            id: 'prog-presup-proyeccion-servicio-deuda',
            label: 'Proyección del servicio de la deuda',
            comingSoon: true,
          },
        ],
      },
      {
        id: 'prog-presup-consultas',
        label: 'Consultas',
        children: [
          {
            id: 'prog-presup-consultas-reportes',
            label: 'Reporte preliminar del gobierno',
            moduleRoute: '/procesos/programacion-presupuestal-deuda/reporte-preliminar-gobierno',
          },
        ],
      },
    ],
  },
  {
    id: 'formulacion-presupuestal-deuda',
    label: 'Formulación presupuestal de deuda',
    comingSoon: true,
    children: [
      { id: 'formulacion-presupuestal-documentos', label: 'Documentos y registros de formulación presupuestal', comingSoon: true },
      { id: 'formulacion-presupuestal-consultas', label: 'Consultas y reportes de formulación presupuestal', comingSoon: true },
    ],
  },
  {
    id: 'clasificadores-catalogos',
    label: 'Clasificadores y catálogos',
    comingSoon: true,
    children: [
      { id: 'clasificadores-catalogos-documentos', label: 'Documentos y registros de clasificadores y catálogos', comingSoon: true },
      { id: 'clasificadores-catalogos-consultas', label: 'Consultas y reportes de clasificadores y catálogos', comingSoon: true },
    ],
  },
  {
    id: 'consultas-reportes',
    label: 'Consultas y reportes',
    comingSoon: true,
    children: [
      { id: 'consultas-reportes-deuda', label: 'Consultas y reportes de deuda', comingSoon: true },
    ],
  },
  {
    id: 'gestion-tesoreria',
    label: 'Gestión de tesorería',
    children: [
      {
        id: 'registro-cuentas-bancarias',
        label: 'Registro de cuentas bancarias',
        children: [
          {
            id: 'registro-cuentas-bancarias-documentos',
            label: 'Documentos y registros de cuentas bancarias',
            moduleRoute: '/procesos/registro-cuentas-bancarias',
            createRoute: '/procesos/registro-cuentas-bancarias/solicitud',
            documentOptions: ['Solicitud de Registro de Cuenta Bancaria'],
            documentCreateOptions: [
              {
                label: 'Solicitud de Registro de Cuenta Bancaria',
                route: '/procesos/registro-cuentas-bancarias/solicitud',
                actionTypes: ['Creación'],
              },
            ],
            actionTypeOptions: ['Creación'],
          },
          {
            id: 'registro-cuentas-bancarias-consultas',
            label: 'Consultas y reportes de cuentas bancarias',
            moduleRoute: '/procesos/registro-cuentas-bancarias/consultas',
          },
        ],
      },
      {
        id: 'programacion-pagos',
        label: 'Programación de pagos',
        comingSoon: true,
        children: [
          { id: 'programacion-pagos-documentos', label: 'Documentos y registros de programación de pagos', comingSoon: true },
          { id: 'programacion-pagos-consultas', label: 'Consultas y reportes de programación de pagos', comingSoon: true },
        ],
      },
    ],
  },
];

export function findProcessPathById(id: string, nodes: readonly ProcessMenuNode[] = DEFAULT_PROCESS_TREE): ProcessMenuNode[] {
  for (const node of nodes) {
    if (node.id === id) {
      return [node];
    }

    const childPath = findProcessPathById(id, node.children || []);

    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}

/**
 * Árbol del menú "Ajustes" (módulo de administración). Lo pinta el mismo `siaf-process-menu-tree`
 * que el menú de procesos, con otros textos. En el taller no hay módulo de administración: las hojas
 * van como «Próximamente» y no navegan.
 */
export const ADMIN_MENU_TREE: ProcessMenuNode[] = [
  {
    id: 'administracion',
    label: 'Administración',
    expanded: true,
    children: [
      {
        id: 'usuarios-accesos',
        label: 'Usuarios y accesos',
        expanded: true,
        children: [
          { id: 'gestion-usuarios', label: 'Gestión de usuarios', comingSoon: true },
          { id: 'perfiles-funcionales', label: 'Perfiles funcionales', comingSoon: true },
        ],
      },
      {
        id: 'organizacion',
        label: 'Organización',
        children: [
          { id: 'entidades', label: 'Entidades', comingSoon: true },
          { id: 'unidades', label: 'Unidades orgánicas', comingSoon: true },
        ],
      },
    ],
  },
];
