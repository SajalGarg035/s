import React from 'react';
import { Code, Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Code className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">CodeSync Pro</span>
            </div>
            <p className="text-gray-300 mb-4">
              Professional real-time collaborative code editor designed for enterprise teams. 
              Built with cutting-edge technology for seamless development experience.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com/sajalgarg035" className="text-gray-400 hover:text-white">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com/in/sajalgarg" className="text-gray-400 hover:text-white">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="mailto:sajalgarg035@gmail.com" className="text-gray-400 hover:text-white">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white">Features</a></li>
              <li><a href="#" className="hover:text-white">Pricing</a></li>
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">API</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
              <li><a href="#" className="hover:text-white">Privacy</a></li>
              <li><a href="#" className="hover:text-white">Terms</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 CodeSync Pro by sajalgarg035. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
