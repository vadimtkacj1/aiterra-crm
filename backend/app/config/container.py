from dependency_injector import containers, providers


class Container(containers.DeclarativeContainer):
    """
    IoC container — wired incrementally as each domain migrates to Clean Architecture.

    Phase 4 will populate this with repositories, adapters, and services.
    Until then this file is a placeholder that establishes the import path and
    confirms dependency-injector is installed correctly.
    """

    wiring_config = containers.WiringConfiguration(modules=[])
