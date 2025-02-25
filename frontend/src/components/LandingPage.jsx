import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-700 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">Análisis de Datos CIS</h1>
          <p className="text-xl mb-8">
            Explora y visualiza datos del Centro de Investigaciones Sociológicas de manera interactiva
          </p>
          <Link
            to="/analysis"
            className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-50 transition duration-300"
          >
            Comenzar análisis
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3">Visualización Interactiva</h3>
            <p>Gráficos dinámicos y tablas de frecuencia para mejor comprensión de los datos</p>
          </div>
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3">Datos Actualizados</h3>
            <p>Accede a los últimos datos disponibles del Centro de Investigaciones Sociológicas</p>
          </div>
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-3">Análisis Detallado</h3>
            <p>Explora diferentes variables y sus relaciones con herramientas analíticas avanzadas</p>
          </div>
        </div>
      </div>
    </div>
  );
} 