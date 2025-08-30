from setuptools import setup, find_packages

setup(
    name="logan-log-viewer",
    version="0.1.0",
    description="A Python log viewer with web UI",
    packages=find_packages(),
    install_requires=[
        "flask>=2.0.0",
        "requests>=2.20.0",
    ],
    include_package_data=True,
    package_data={
        "logan": ["web_ui/*", "assets/*"],
    },
    python_requires=">=3.7",
)