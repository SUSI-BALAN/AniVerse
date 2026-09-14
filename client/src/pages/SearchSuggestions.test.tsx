import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect,it,vi } from 'vitest';
import { SearchPage } from './SearchPage';
vi.mock('../context/LibraryContext',()=>({useLibrary:()=>({searchHistory:[{id:1,query:'Naruto'},{id:2,query:'Naruto Shippuden'}],addSearch:vi.fn(),removeSearch:vi.fn(),clearSearches:vi.fn()})}));
vi.mock('../hooks/useDebounce',()=>({useDebounce:(v:string)=>v}));
vi.mock('../hooks/useAnimeSearch',()=>({useAnimeSearch:()=>({anime:[],pagination:null,loading:false,error:null,retry:vi.fn()})}));
it('navigates local suggestions with arrows, Enter, and Escape using combobox state',()=>{
  render(<MemoryRouter><SearchPage/></MemoryRouter>);const input=screen.getByRole('combobox',{name:'Search anime'});
  fireEvent.change(input,{target:{value:'Nar'}});expect(screen.getByRole('listbox')).toBeInTheDocument();
  fireEvent.keyDown(input,{key:'ArrowDown'});expect(input).toHaveAttribute('aria-activedescendant','search-suggestion-0');
  fireEvent.keyDown(input,{key:'ArrowDown'});fireEvent.keyDown(input,{key:'ArrowUp'});expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected','true');
  fireEvent.keyDown(input,{key:'Enter'});expect(input).toHaveValue('Naruto');expect(input).toHaveAttribute('aria-expanded','false');
  fireEvent.change(input,{target:{value:'Nar'}});fireEvent.keyDown(input,{key:'Escape'});expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
