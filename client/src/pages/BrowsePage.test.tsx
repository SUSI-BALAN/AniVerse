import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAnimePage } from "../hooks/useAnimePage";
import { BrowsePage, browseParams, parseBrowseParams } from "./BrowsePage";

vi.mock("../hooks/useAnimePage");

function LocationControls() { const navigate=useNavigate(),location=useLocation(); return <><output aria-label="URL">{location.search}</output><button onClick={()=>navigate(-1)}>Back test</button><button onClick={()=>navigate(1)}>Forward test</button></>; }

describe("BrowsePage", () => {
  it('round trips every supported filter and page deterministically', () => {
    const filters = {genres:['Comedy','Action'],formats:['TV','MOVIE'],statuses:['FINISHED'],yearFrom:2020,yearTo:2026,season:'FALL' as const,minScore:80,sort:'SCORE' as const};
    const url=browseParams(filters,2);
    expect(url.get('genres')).toBe('Action,Comedy');
    expect(parseBrowseParams(url)).toEqual({filters:{...filters,genres:['Action','Comedy'],formats:['MOVIE','TV'],genre:undefined,format:undefined,status:undefined,year:undefined},page:2});
  });
  it('falls back safely for malformed filters without invalid upstream values', () => {
    const {filters,page}=parseBrowseParams(new URLSearchParams('genres=Action,invalid&format=BOOK&status=bad&season=bad&yearFrom=abc&yearTo=9999&minScore=-2&sort=bad&page=-1'));
    expect(filters.genres).toEqual(['Action']); expect(page).toBe(1);
    expect(filters).toMatchObject({format:undefined,status:undefined,season:undefined,yearFrom:undefined,yearTo:undefined,minScore:undefined,sort:'POPULARITY'});
  });
  it('defers mobile multi-filter changes and restores URL state with Back and Forward', async () => {
    vi.mocked(useAnimePage).mockReturnValue({anime:[],pagination:null,loading:false,error:null,retry:vi.fn()});
    render(<MemoryRouter initialEntries={['/browse']}><BrowsePage/><LocationControls/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Filters'}));
    const d=within(screen.getByRole('dialog',{name:'Browse filters'}));
    const genres=d.getByRole('listbox') as HTMLSelectElement;
    for(const option of genres.options) option.selected=['Action','Comedy'].includes(option.value);
    fireEvent.change(genres);
    fireEvent.change(d.getByLabelText('Year from'),{target:{value:'2020'}});
    fireEvent.change(d.getByLabelText('Year to'),{target:{value:'2026'}});
    expect(screen.getByLabelText('URL')).toHaveTextContent('');
    fireEvent.click(d.getByRole('button',{name:'Show results'}));
    await waitFor(()=>expect(screen.getByLabelText('URL')).toHaveTextContent('genres=Action%2CComedy'));
    const committed=screen.getByLabelText('URL').textContent;
    fireEvent.click(screen.getByRole('button',{name:'Remove Action genres filter'}));
    expect(screen.getByLabelText('URL')).toHaveTextContent('genres=Comedy');
    fireEvent.click(screen.getByRole('button',{name:'Back test'}));
    await waitFor(()=>expect(screen.getByLabelText('URL').textContent).toBe(committed));
    fireEvent.click(screen.getByRole('button',{name:'Forward test'}));
    await waitFor(()=>expect(screen.getByLabelText('URL')).toHaveTextContent('genres=Comedy'));
    fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
    expect(screen.getByLabelText('URL').textContent).toBe('');
  });
  it('blocks an invalid mobile range with feedback and disabled Apply', () => {
    vi.mocked(useAnimePage).mockReturnValue({anime:[],pagination:null,loading:false,error:null,retry:vi.fn()});
    render(<MemoryRouter><BrowsePage/><LocationControls/></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Filters'}));const d=within(screen.getByRole('dialog'));
    fireEvent.change(d.getByLabelText('Year from'),{target:{value:'2026'}});fireEvent.change(d.getByLabelText('Year to'),{target:{value:'2020'}});
    expect(d.getByRole('alert')).toBeInTheDocument();expect(d.getByRole('button',{name:'Show results'})).toBeDisabled();expect(screen.getByLabelText('URL').textContent).toBe('');
  });
  it("opens mobile filters and exposes selected filter chips", () => {
    vi.mocked(useAnimePage).mockReturnValue({ anime: [], pagination: null, loading: false, error: null, retry: vi.fn() });
    render(<MemoryRouter><BrowsePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = screen.getByRole("dialog", { name: "Browse filters" });
    fireEvent.change(dialog.querySelector('select')!, { target: { value: "Action" } });
    expect(screen.getByRole("button", { name: /Action/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("keeps keyboard focus inside the filter drawer and restores it on close", async () => {
    vi.mocked(useAnimePage).mockReturnValue({ anime: [], pagination: null, loading: false, error: null, retry: vi.fn() });
    render(<MemoryRouter><BrowsePage /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Filters" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Browse filters" });
    const close = screen.getByRole("button", { name: "Close" });
    const showResults = screen.getByRole("button", { name: "Show results" });
    expect(close).toHaveFocus();

    showResults.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
