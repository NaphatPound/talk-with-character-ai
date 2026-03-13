import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage/HomePage';
import CharacterCreate from './pages/CharacterCreate/CharacterCreate';
import CharacterGallery from './pages/CharacterGallery/CharacterGallery';
import StoryCreate from './pages/StoryCreate/StoryCreate';
import StoryBrowse from './pages/StoryBrowse/StoryBrowse';
import StoryReader from './pages/StoryReader/StoryReader';
import AIChat from './pages/AIChat/AIChat';
import Settings from './pages/Settings/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Story Reader is full-screen, no layout */}
        <Route path="/stories/read/:id" element={<StoryReader />} />

        {/* All other routes with layout */}
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/characters" element={<CharacterGallery />} />
              <Route path="/characters/create" element={<CharacterCreate />} />
              <Route path="/characters/edit/:id" element={<CharacterCreate />} />
              <Route path="/stories" element={<StoryBrowse />} />
              <Route path="/stories/create" element={<StoryCreate />} />
              <Route path="/stories/edit/:id" element={<StoryCreate />} />
              <Route path="/stories/:id" element={<StoryBrowse />} />
              <Route path="/ai-chat" element={<AIChat />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
